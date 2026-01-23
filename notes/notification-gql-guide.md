
# ===========================================
# NOTES FOR DEVELOPERS
# ===========================================

"""
NOTIFICATION FLOW:

1. SYSTEM EVENT OCCURS:
   - Investment created
   - Document verified
   - Dividend paid
   - etc.

2. CREATE NOTIFICATION:
   sendNotification({
     investorId,
     type: INVESTMENT_CONFIRMED,
     title: "Investment Confirmed",
     message: "Your £50,000 investment in Maple Street Apartments has been confirmed",
     priority: HIGH,
     link: "/investments/inv-123"
   })

3. DELIVERY:
   - Save to DynamoDB (in-app notification)
   - Send email (if preferences allow)
   - Send push notification (if preferences allow)

4. USER INTERACTION:
   - User sees notification in app
   - User clicks notification → navigates to link
   - User marks as read
   - User deletes notification

NOTIFICATION PREFERENCES:

Users can control:
✅ Email notifications (on/off per category)
✅ Push notifications (on/off per category)
✅ Digest frequency (immediate, daily, weekly)
✅ Marketing messages (on/off)

NOTIFICATION TYPES BY CATEGORY:

CRITICAL (always sent):
- ACCOUNT_SUSPENDED
- SECURITY_ALERT
- KYC_REJECTED

IMPORTANT (default on):
- INVESTMENT_CONFIRMED
- DIVIDEND_RECEIVED
- KYC_APPROVED
- DOCUMENT_VERIFIED

OPTIONAL (can disable):
- NEW_PROPERTY_AVAILABLE
- PROPERTY_UPDATE
- PROMOTIONAL_MESSAGE

AUTO-CLEANUP:
✅ Read notifications older than 30 days → auto-deleted
✅ Expired notifications → auto-deleted
✅ User can manually delete notifications

PERMISSIONS:
✅ Users can view/manage their own notifications
✅ Users can update their own preferences
✅ Admin can send notifications to any user
✅ Admin can bulk send notifications (admin.graphql)
"""