// lambda/admin/delete-property/index.ts

import { DeleteCommand } from "@aws-sdk/lib-dynamodb/dist-types/commands/DeleteCommand";
import { docClient } from "@shared/db/client";
import { AppSyncEvent } from "@shared/types";
import { PermissionChecker } from "@shared/utils/permissions";

export const handler = async (event: AppSyncEvent) => {
  // 🔐 Only SuperAdmin can delete
  PermissionChecker.requireSuperAdmin(event);

  const propertyId = event.arguments.id;
  
  // Delete property
  await docClient.send(
    new DeleteCommand({
      TableName: process.env.PROPERTIES_TABLE!,
      Key: { id: propertyId },
    })
  );

  return { success: true };
};