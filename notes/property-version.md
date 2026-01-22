/*
EXAMPLE QUERY:

query GetPropertyHistory {
  getPropertyVersions(propertyId: "property-123") {
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

EXAMPLE RESPONSE:

{
  "currentVersion": 5,
  "totalVersions": 5,
  "timeline": [
    {
      "version": 5,
      "timestamp": "2025-01-20T15:30:00Z",
      "user": "admin@prepg3.com",
      "reason": "Property fully funded - closing to new investors",
      "isCurrent": true,
      "changes": [
        { "field": "status", "oldValue": "ACTIVE", "newValue": "FUNDED" },
        { "field": "listingStatus", "oldValue": "LISTED", "newValue": "SOLD" }
      ]
    },
    {
      "version": 4,
      "timestamp": "2025-01-15T10:00:00Z",
      "user": "admin@prepg3.com",
      "reason": "Professional valuation completed - value increased",
      "isCurrent": false,
      "changes": [
        { "field": "currentValue", "oldValue": 250000, "newValue": 275000 }
      ]
    },
    {
      "version": 3,
      "timestamp": "2025-01-10T14:20:00Z",
      "user": "propertymanager@prepg3.com",
      "reason": "Property images updated",
      "isCurrent": false,
      "changes": [
        { "field": "images", "oldValue": ["img1.jpg"], "newValue": ["img1.jpg", "img2.jpg", "img3.jpg"] }
      ]
    }
  ]
}

UI DISPLAY:

╔═══════════════════════════════════════════════════════════╗
║  Property History - 123 Main Street                      ║
║  Current Version: 5 of 5                                  ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ● Version 5 (Current) - Jan 20, 2025 15:30             ║
║    by admin@prepg3.com                                    ║
║    Reason: Property fully funded - closing to investors  ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • Status: ACTIVE → FUNDED                         │ ║
║    │ • Listing Status: LISTED → SOLD                   │ ║
║    └───────────────────────────────────────────────────┘ ║
║                                                           ║
║  ○ Version 4 - Jan 15, 2025 10:00                        ║
║    by admin@prepg3.com                                    ║
║    Reason: Professional valuation completed              ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • Current Value: £250,000 → £275,000              │ ║
║    └───────────────────────────────────────────────────┘ ║
║                                                           ║
║  ○ Version 3 - Jan 10, 2025 14:20                        ║
║    by propertymanager@prepg3.com                          ║
║    Reason: Property images updated                        ║
║    ┌───────────────────────────────────────────────────┐ ║
║    │ • Images: 1 photo → 3 photos                      │ ║
║    └───────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════╝

[View Version 4] [View Version 3] [Compare Versions] [Restore]
*/