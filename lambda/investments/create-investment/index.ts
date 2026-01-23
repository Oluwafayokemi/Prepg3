// lambda/investments/create-investment/index.ts
// INVESTOR OPERATION - Investors use this to invest in properties

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { PermissionChecker } from "@shared/utils/permissions";
import { Logger } from "@shared/utils/logger";
import { ValidationError, UnauthorizedError } from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { v4 as uuidv4 } from "uuid";

const ses = new SESClient({});
const logger = new Logger("CreateInvestment");

interface CreateInvestmentInput {
  propertyId: string;
  amountInvested: number;
  shares: number;
  paymentMethod: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Creating investment", { event });

  try {
    const input: CreateInvestmentInput = event.arguments.input;
    const userId = event.identity?.claims?.sub;
    const userEmail = event.identity?.claims?.email;

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // 🔐 CRITICAL: Only VERIFIED investors can invest
    if (!PermissionChecker.isVerifiedInvestor(event)) {
      throw new UnauthorizedError(
        "You must complete KYC verification before investing. Please submit your documents."
      );
    }

    // Validate input
    if (input.amountInvested <= 0) {
      throw new ValidationError("Investment amount must be positive");
    }

    if (input.shares <= 0) {
      throw new ValidationError("Number of shares must be positive");
    }

    // Get investor
    const investorResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVESTORS_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": userId,
          ":current": "CURRENT",
        },
        Limit: 1,
      })
    );

    if (!investorResult.Items || investorResult.Items.length === 0) {
      throw new Error("Investor profile not found");
    }

    const investor = investorResult.Items[0];

    // Check investor is active and verified
    if (investor.accountStatus !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    if (investor.kycStatus !== "APPROVED") {
      throw new UnauthorizedError("KYC verification required");
    }

    // Get property
    const propertyResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        IndexName: "currentVersions",
        KeyConditionExpression: "id = :id AND isCurrent = :current",
        ExpressionAttributeValues: {
          ":id": input.propertyId,
          ":current": "CURRENT",
        },
        Limit: 1,
      })
    );

    if (!propertyResult.Items || propertyResult.Items.length === 0) {
      throw new Error("Property not found");
    }

    const property = propertyResult.Items[0];

    // Validate property is available for investment
    if (property.status !== "ACTIVE") {
      throw new ValidationError("Property is not available for investment");
    }

    if (property.listingStatus !== "LISTED") {
      throw new ValidationError("Property is not currently listed");
    }

    // Check minimum/maximum investment limits
    if (input.amountInvested < property.minimumInvestment) {
      throw new ValidationError(
        `Minimum investment is £${property.minimumInvestment.toLocaleString()}`
      );
    }

    if (property.maximumInvestment && input.amountInvested > property.maximumInvestment) {
      throw new ValidationError(
        `Maximum investment is £${property.maximumInvestment.toLocaleString()}`
      );
    }

    // Calculate price per share
    const pricePerShare = input.amountInvested / input.shares;

    // Check if shares are available
    const currentFunding = property.currentFunding || 0;
    const targetFunding = property.targetFundingAmount;
    const remainingFunding = targetFunding - currentFunding;

    if (input.amountInvested > remainingFunding) {
      throw new ValidationError(
        `Only £${remainingFunding.toLocaleString()} remaining for this property`
      );
    }

    const now = new Date().toISOString();
    const investmentId = uuidv4();

    // Create investment
    const investment = {
      id: investmentId,
      investorId: userId,
      propertyId: input.propertyId,
      amountInvested: input.amountInvested,
      shares: input.shares,
      pricePerShare,
      currentValue: input.amountInvested, // Initially same as invested
      status: "ACTIVE",
      paymentMethod: input.paymentMethod,
      investmentDate: now,
      createdAt: now,
      updatedAt: now,
      createdBy: userEmail || userId,
    };

    // Save investment
    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTMENTS_TABLE!,
        Item: investment,
      })
    );

    // Update property funding (create new version)
    const newPropertyVersion = property.version + 1;
    const newCurrentFunding = currentFunding + input.amountInvested;

    // Mark old property version as HISTORICAL
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Key: {
          id: input.propertyId,
          version: property.version,
        },
        UpdateExpression: "SET isCurrent = :historical",
        ExpressionAttributeValues: {
          ":historical": "HISTORICAL",
        },
      })
    );

    // Create new property version with updated funding
    await docClient.send(
      new PutCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Item: {
          ...property,
          version: newPropertyVersion,
          currentFunding: newCurrentFunding,
          updatedAt: now,
          updatedBy: "SYSTEM",
          changedFields: ["currentFunding"],
          changeReason: `Investment of £${input.amountInvested} by ${userEmail}`,
          previousVersion: property.version,
        },
      })
    );

    // Create transaction record
    const transactionId = uuidv4();
    await docClient.send(
      new PutCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        Item: {
          id: transactionId,
          investorId: userId,
          investmentId,
          propertyId: input.propertyId,
          type: "INVESTMENT",
          amount: input.amountInvested,
          status: "COMPLETED",
          paymentMethod: input.paymentMethod,
          createdAt: now,
        },
      })
    );

    // Send confirmation email
    try {
      await ses.send(
        new SendEmailCommand({
          Source: process.env.FROM_EMAIL!,
          Destination: {
            ToAddresses: [userEmail || investor.email],
          },
          Message: {
            Subject: {
              Data: "Investment Confirmed - PREPG3",
            },
            Body: {
              Html: {
                Data: `
                  <h2>Investment Confirmed!</h2>
                  <p>Your investment has been successfully processed.</p>
                  <p><strong>Details:</strong></p>
                  <ul>
                    <li>Property: ${property.propertyName}</li>
                    <li>Amount: £${input.amountInvested.toLocaleString()}</li>
                    <li>Shares: ${input.shares}</li>
                    <li>Investment ID: ${investmentId}</li>
                  </ul>
                  <p><a href="${process.env.APP_URL}/investments/${investmentId}">View Investment</a></p>
                `,
              },
            },
          },
        })
      );
    } catch (error) {
      logger.warn("Failed to send email", { error });
    }

    logger.info("Investment created successfully", {
      investmentId,
      investorId: userId,
      propertyId: input.propertyId,
      amount: input.amountInvested,
    });

    return investment;

  } catch (error) {
    logger.error("Error creating investment", error);
    throw error;
  }
};

/*
EXAMPLE MUTATION:

mutation CreateInvestment {
  createInvestment(input: {
    propertyId: "property-123"
    amountInvested: 50000
    shares: 500
    paymentMethod: "BANK_TRANSFER"
  }) {
    id
    investorId
    propertyId
    amountInvested
    shares
    pricePerShare
    status
    investmentDate
  }
}

PERMISSIONS:
- User must be authenticated
- User must be in "VerifiedInvestors" Cognito group
- KYC status must be "APPROVED"
- Account status must be "ACTIVE"

VALIDATIONS:
- Property must be ACTIVE and LISTED
- Amount must be >= minimumInvestment
- Amount must be <= maximumInvestment (if set)
- Amount must not exceed remaining funding
- Shares must be positive
*/