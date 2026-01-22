// lambda/investors/complete-profile/index.ts

import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

const logger = new Logger("CompleteProfile");

interface CompleteProfileInput {
  investorId: string;
  middleName?: string;
  title?: string;
  mobilePhone?: string;
  mailingAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    residencySince?: string;
    isCurrentAddress: boolean;
  };
  employmentStatus?: string;
  occupation?: string;
  employer?: string;
  annualIncome?: string;
  preferredContactMethod?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Completing investor profile", { event });

  try {
    const input: CompleteProfileInput = event.arguments.input;

    validateRequired(input.investorId, "investorId");

    // Authorization: Users can only update their own profile
    const userId = PermissionChecker.getUserId(event);

    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Get investor to check ownership
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId, isCurrent: "CURRENT" },
      }),
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor not found");
    }

    PermissionChecker.requireOwnerOrAdmin(
      event,
      getResult.Item.userId || getResult.Item.id,
      "profile",
    );
    logger.info("Authorization passed");

    // Build update expression
    const updateExpressions: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};

    // Add optional fields
    if (input.middleName !== undefined) {
      updateExpressions.push("#middleName = :middleName");
      attributeNames["#middleName"] = "middleName";
      attributeValues[":middleName"] = input.middleName?.trim() || null;
    }

    if (input.title !== undefined) {
      updateExpressions.push("#title = :title");
      attributeNames["#title"] = "title";
      attributeValues[":title"] = input.title?.trim() || null;
    }

    if (input.mobilePhone !== undefined) {
      updateExpressions.push("#mobilePhone = :mobilePhone");
      attributeNames["#mobilePhone"] = "mobilePhone";
      attributeValues[":mobilePhone"] = input.mobilePhone?.trim() || null;
    }

    if (input.mailingAddress) {
      updateExpressions.push("#mailingAddress = :mailingAddress");
      attributeNames["#mailingAddress"] = "mailingAddress";
      attributeValues[":mailingAddress"] = {
        addressLine1: input.mailingAddress.addressLine1.trim(),
        addressLine2: input.mailingAddress.addressLine2?.trim() || null,
        city: input.mailingAddress.city.trim(),
        county: input.mailingAddress.county?.trim() || null,
        postcode: input.mailingAddress.postcode.trim().toUpperCase(),
        country: input.mailingAddress.country.trim(),
        residencySince:
          input.mailingAddress.residencySince ||
          new Date().toISOString().split("T")[0],
        isCurrentAddress: input.mailingAddress.isCurrentAddress ?? false,
      };
    }

    if (input.employmentStatus !== undefined) {
      updateExpressions.push("#employmentStatus = :employmentStatus");
      attributeNames["#employmentStatus"] = "employmentStatus";
      attributeValues[":employmentStatus"] = input.employmentStatus;
    }

    if (input.occupation !== undefined) {
      updateExpressions.push("#occupation = :occupation");
      attributeNames["#occupation"] = "occupation";
      attributeValues[":occupation"] = input.occupation?.trim() || null;
    }

    if (input.employer !== undefined) {
      updateExpressions.push("#employer = :employer");
      attributeNames["#employer"] = "employer";
      attributeValues[":employer"] = input.employer?.trim() || null;
    }

    if (input.annualIncome !== undefined) {
      updateExpressions.push("#annualIncome = :annualIncome");
      attributeNames["#annualIncome"] = "annualIncome";
      attributeValues[":annualIncome"] = input.annualIncome;
    }

    if (input.preferredContactMethod !== undefined) {
      updateExpressions.push(
        "#preferredContactMethod = :preferredContactMethod",
      );
      attributeNames["#preferredContactMethod"] = "preferredContactMethod";
      attributeValues[":preferredContactMethod"] = input.preferredContactMethod;
    }

    // Always update updatedAt
    updateExpressions.push("#updatedAt = :updatedAt");
    attributeNames["#updatedAt"] = "updatedAt";
    attributeValues[":updatedAt"] = new Date().toISOString();

    if (updateExpressions.length === 0) {
      throw new ValidationError("No fields to update");
    }

    // Update investor profile
    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.investorId },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues,
        ReturnValues: "ALL_NEW",
      }),
    );

    logger.info("Profile completed successfully", {
      investorId: input.investorId,
      updatedFields: Object.keys(attributeValues),
    });

    return result.Attributes;
  } catch (error) {
    logger.error("Error completing profile", error);
    throw error;
  }
};
