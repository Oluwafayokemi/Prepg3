# ===========================================
# NOTES FOR DEVELOPERS
# ===========================================

"""
TRANSACTION LIFECYCLE:

1. CREATION:
   createTransaction → PENDING
   (Usually called internally by createInvestment)

2. PROCESSING:
   processTransaction → PROCESSING
   Payment gateway processes payment

3. COMPLETION:
   completeTransaction → COMPLETED
   OR
   failTransaction → FAILED

4. CANCELLATION (optional):
   cancelTransaction → CANCELLED

5. REFUND (optional):
   refundTransaction → REFUNDED

TRANSACTION TYPES:

INVESTMENT:
- User invests money in property
- Creates Investment record
- Creates INVESTMENT transaction

DIVIDEND:
- Property generates rental income
- Distributed to investors proportionally
- Creates DIVIDEND transaction for each investor

PLATFORM_FEE:
- Charged on each investment
- Creates PLATFORM_FEE transaction

WITHDRAWAL:
- User withdraws money from account
- Creates WITHDRAWAL transaction

PERMISSIONS:
✅ Users can view their own transactions
✅ Users can cancel PENDING transactions
✅ Admin can process/complete/fail transactions
✅ Admin can issue refunds

AUDIT TRAIL:
✅ All transactions are immutable once COMPLETED
✅ Changes create audit logs
✅ All amounts, dates, statuses tracked
"""