/*
QUERY FOR UI:

query GetInvestorHistory {
  getInvestorVersions(investorId: "investor-123") {
    currentVersion
    totalVersions
    timeline {
      version
      timestamp
      user
      reason
      isCurrent
      changes {
        field
        oldValue
        newValue
      }
    }
  }
}

RESPONSE:

{
  "currentVersion": 3,
  "totalVersions": 3,
  "timeline": [
    {
      "version": 3,
      "timestamp": "2025-02-01T09:15:00Z",
      "user": "system",
      "reason": "Investment recorded",
      "isCurrent": true,
      "changes": [
        { "field": "totalInvested", "oldValue": 0, "newValue": 50000 },
        { "field": "portfolioValue", "oldValue": 0, "newValue": 50000 }
      ]
    },
    {
      "version": 2,
      "timestamp": "2025-01-20T14:30:00Z",
      "user": "compliance@prepg3.com",
      "reason": "KYC approved",
      "isCurrent": false,
      "changes": [
        { "field": "kycStatus", "oldValue": "PENDING", "newValue": "APPROVED" }
      ]
    },
    {
      "version": 1,
      "timestamp": "2025-01-15T10:00:00Z",
      "user": "john@example.com",
      "reason": "Initial registration",
      "isCurrent": false,
      "changes": []
    }
  ]
}

UI DISPLAY:

╔═══════════════════════════════════════════════════════════╗
║  Investor History - John Doe (investor-123)               ║
║  Current Version: 3 of 3                                  ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ● Version 3 (Current) - Feb 1, 2025 09:15               ║
║    by system                                              ║
║    Reason: Investment recorded                            ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • Total Invested: £0 → £50,000                    │ ║
║    │ • Portfolio Value: £0 → £50,000                   │ ║
║    └───────────────────────────────────────────────────┘ ║
║                                                           ║
║  ○ Version 2 - Jan 20, 2025 14:30                        ║
║    by compliance@prepg3.com                               ║
║    Reason: KYC approved                                   ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • KYC Status: PENDING → APPROVED                  │ ║
║    └───────────────────────────────────────────────────┘ ║
║                                                           ║
║  ○ Version 1 - Jan 15, 2025 10:00                        ║
║    by john@example.com                                    ║
║    Reason: Initial registration                           ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • Account created                                 │ ║
║    └───────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════╝

[View Version 2] [View Version 1] [Compare Versions]
*/