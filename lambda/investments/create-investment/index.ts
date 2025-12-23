// lambda/investments/create-investment/index.ts
// lambda/investments/create-investment/index.ts
import { docClient } from '@shared/db/client';
import { Logger } from '@shared/utils/logger';
import { validateRequired, validatePositiveNumber, validatePercentage } from '@shared/utils/validators';
import { handleError, NotFoundError } from '@shared/utils/errors';
import type { AppSyncEvent } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const logger = new Logger('CreateInvestment');

// ... rest of your code

interface CreateInvestmentInput {
  investorId: string;
  propertyId: string;
  investmentAmount: number;
  equityPercentage: number;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Creating investment", { event });

  try {
    const input: CreateInvestmentInput = event.arguments.input;

    // Validate inputs
    validateRequired(input.investorId, "investorId");
    validateRequired(input.propertyId, "propertyId");
    validatePositiveNumber(input.investmentAmount, "investmentAmount");
    validatePercentage(input.equityPercentage, "equityPercentage");

    // Authorization check
    const groups = event.identity.claims["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const currentInvestorId = event.identity.claims["custom:investorId"];

    if (!isAdmin && currentInvestorId !== input.investorId) {
      throw new Error("You can only create investments for yourself");
    }

    const investmentId = uuidv4();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // 1. Verify investor exists
    const investorResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
      })
    );

    if (!investorResult.Item) {
      throw new NotFoundError("Investor");
    }

    // 2. Verify property exists
    const propertyResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Key: { id: input.propertyId },
      })
    );

    if (!propertyResult.Item) {
      throw new NotFoundError("Property");
    }

    // 3. Create investment record
    const investment = {
      id: investmentId,
      investorId: input.investorId,
      propertyId: input.propertyId,
      investmentAmount: input.investmentAmount,
      equityPercentage: input.equityPercentage,
      investmentDate: today,
      currentValue: input.investmentAmount, // Initially same as investment
      roi: 0, // Will be calculated by ROI Lambda
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.INVESTMENTS_TABLE!,
        Item: investment,
      })
    );

    logger.info("Investment record created", { investmentId });

    // 4. Update property totalInvested
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.PROPERTIES_TABLE!,
        Key: { id: input.propertyId },
        UpdateExpression:
          "SET totalInvested = if_not_exists(totalInvested, :zero) + :amount, updatedAt = :now",
        ExpressionAttributeValues: {
          ":amount": input.investmentAmount,
          ":zero": 0,
          ":now": now,
        },
      })
    );

    logger.info("Property updated with investment", {
      propertyId: input.propertyId,
    });

    // 5. Update investor totalInvested
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
        UpdateExpression:
          "SET totalInvested = if_not_exists(totalInvested, :zero) + :amount, updatedAt = :now",
        ExpressionAttributeValues: {
          ":amount": input.investmentAmount,
          ":zero": 0,
          ":now": now,
        },
      })
    );

    logger.info("Investor updated with investment", {
      investorId: input.investorId,
    });

    // 6. Create transaction record
    const transaction = {
      id: uuidv4(),
      investorId: input.investorId,
      propertyId: input.propertyId,
      type: "INVESTMENT",
      amount: input.investmentAmount,
      description: `Investment in property at ${propertyResult.Item.address}`,
      date: today,
      reference: investmentId,
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TRANSACTIONS_TABLE!,
        Item: transaction,
      })
    );

    logger.info("Transaction record created");

    // 7. Create notification
    const notification = {
      id: uuidv4(),
      investorId: input.investorId,
      title: "Investment Confirmed",
      message: `Your investment of £${input.investmentAmount.toLocaleString()} in ${
        propertyResult.Item.address
      } has been confirmed.`,
      type: "INVESTMENT_UPDATE",
      isRead: false,
      createdAt: now,
      link: `/investments/${investmentId}`,
      ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE!,
        Item: notification,
      })
    );

    logger.info("Notification created");

    logger.info("Investment created successfully", { investmentId });

    return investment;
  } catch (error) {
    logger.error("Error creating investment", error);
    return handleError(error);
  }
};
