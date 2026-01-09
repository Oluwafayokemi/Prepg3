// lambda/investors/update-investor/index.ts

import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "@shared/db/client";
import { Logger } from "@shared/utils/logger";
import { validateRequired } from "@shared/utils/validators";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/utils/errors";
import type { AppSyncEvent } from "../../shared/types";

const logger = new Logger("UpdateInvestor");

interface UpdateInvestorInput {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export const handler = async (event: AppSyncEvent) => {
  logger.info("Updating investor", { event });

  try {
    const input: UpdateInvestorInput = event.arguments.input;
    validateRequired(input.id, "id");

    // Authorization check
    const groups = event.identity?.claims?.["cognito:groups"] || [];
    const isAdmin = groups.includes("Admin");
    const userSub = event.identity?.sub || event.identity?.username;

    logger.info("Authorization check", {
      userSub,
      investorId: input.id,
      isAdmin,
      groups,
    });

    // Only allow users to update their own profile, or admins to update anyone
    if (!isAdmin && userSub !== input.id) {
      logger.error("Authorization failed", { userSub, investorId: input.id });
      throw new UnauthorizedError("You can only update your own profile");
    }

    logger.info("Authorization passed");

    // Check if investor exists
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.id },
      })
    );

    if (!getResult.Item) {
      throw new NotFoundError("Investor");
    }

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Add updatedAt timestamp
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    // Update firstName
    if (input.firstName !== undefined) {
      if (!input.firstName.trim()) {
        throw new ValidationError("First name cannot be empty");
      }
      updateExpressions.push("#firstName = :firstName");
      expressionAttributeNames["#firstName"] = "firstName";
      expressionAttributeValues[":firstName"] = input.firstName.trim();
    }

    // Update lastName
    if (input.lastName !== undefined) {
      if (!input.lastName.trim()) {
        throw new ValidationError("Last name cannot be empty");
      }
      updateExpressions.push("#lastName = :lastName");
      expressionAttributeNames["#lastName"] = "lastName";
      expressionAttributeValues[":lastName"] = input.lastName.trim();
    }

    // Update phone
    if (input.phone !== undefined) {
      // Phone can be null/empty to remove it
      if (input.phone && input.phone.trim()) {
        // Basic phone validation (can be enhanced)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(input.phone)) {
          throw new ValidationError("Invalid phone number format");
        }
        updateExpressions.push("#phone = :phone");
        expressionAttributeNames["#phone"] = "phone";
        expressionAttributeValues[":phone"] = input.phone.trim();
      } else {
        // Remove phone if empty string provided
        updateExpressions.push("REMOVE #phone");
        expressionAttributeNames["#phone"] = "phone";
      }
    }

    // Update email (only admins can change email)
    if (input.email !== undefined) {
      if (!isAdmin) {
        throw new UnauthorizedError("Only admins can change email addresses");
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        throw new ValidationError("Invalid email format");
      }

      updateExpressions.push("#email = :email");
      expressionAttributeNames["#email"] = "email";
      expressionAttributeValues[":email"] = input.email.toLowerCase().trim();
    }

    // Perform update
    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVESTORS_TABLE!,
        Key: { id: input.id },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedInvestor = updateResult.Attributes;

    logger.info("Investor updated successfully", {
      investorId: input.id,
      updatedFields: Object.keys(input).filter((k) => k !== "id"),
    });

    return {
      id: updatedInvestor!.id,
      email: updatedInvestor!.email,
      firstName: updatedInvestor!.firstName,
      lastName: updatedInvestor!.lastName,
      phone: updatedInvestor!.phone || null,
      totalInvested: updatedInvestor!.totalInvested || 0,
      portfolioValue: updatedInvestor!.portfolioValue || 0,
      totalROI: updatedInvestor!.totalROI || 0,
      createdAt: updatedInvestor!.createdAt,
      updatedAt: updatedInvestor!.updatedAt,
    };
  } catch (error) {
    logger.error("Error updating investor", error);
    throw error;
  }
};
