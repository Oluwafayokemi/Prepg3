
# ===========================================
# NOTES FOR DEVELOPERS
# ===========================================

"""
EMAIL MARKETING STRATEGY:

TWO SYSTEMS:
1. Transactional Emails (AWS SES):
   - KYC approved/rejected
   - Investment confirmed
   - Password reset
   - Document verified
   
2. Marketing Emails (Mailchimp):
   - Newsletter subscriptions
   - Property announcements
   - Monthly updates
   - Investment tips

MAILCHIMP LISTS (AUDIENCES):
1. Newsletter Subscribers (main list)
2. New Property Alerts
3. Investment Tips
4. VIP Investors (£100k+)

MAILCHIMP TAGS:
- verified (KYC approved)
- active-investor (has investments)
- high-net-worth (£100k+ invested)
- professional-investor
- interested-in-commercial
- interested-in-residential

AUTO-TAGGING:
When investor:
- Gets KYC approved → Add "verified" tag
- Makes first investment → Add "active-investor" tag
- Invests £100k+ → Add "high-net-worth" tag
- Shows interest in commercial → Add "interested-in-commercial" tag

NEWSLETTER FLOW:
1. User subscribes (landing page or platform)
2. Lambda subscribes to Mailchimp
3. Saves subscription in DynamoDB
4. User gets welcome email
5. User preferences synced to Mailchimp tags

PROPERTY ALERT FLOW:
1. Admin lists new property
2. Admin clicks "Send Property Alert"
3. Lambda creates Mailchimp campaign
4. Campaign sent to subscribers with "property-updates" tag
5. Tracks opens/clicks in Mailchimp

CAMPAIGN CREATION FLOW:
1. Admin creates campaign (draft)
2. Admin schedules or sends immediately
3. Lambda creates campaign in Mailchimp
4. Campaign status tracked in DynamoDB
5. Stats synced from Mailchimp

UNSUBSCRIBE FLOW:
1. User clicks unsubscribe in email
2. Mailchimp webhook triggers Lambda
3. Lambda updates DynamoDB
4. User marked as unsubscribed

GDPR COMPLIANCE:
✅ Double opt-in (Mailchimp handles)
✅ Easy unsubscribe (in every email)
✅ Preference management
✅ Data export on request
✅ Deletion on request