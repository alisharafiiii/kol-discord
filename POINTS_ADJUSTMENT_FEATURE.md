# Manual Points Adjustment Feature

## Overview
Implemented a comprehensive manual points adjustment system for admins and core team members to directly modify user points through both the admin panel and Discord bot.

## Features

### 1. Admin Panel Points Editing

**Location**: Admin > Engagement > Settings tab > Opted-In Users table

**How it works**:
- Click on any user's points value to enter edit mode
- Enter the new points value
- Click "Save" to apply changes or "Cancel" to discard
- System automatically calculates the difference and logs the transaction

**Features**:
- Real-time updates without page refresh
- Prevents negative point balances
- Shows loading state during save
- Clear success confirmation with new balance
- Automatic transaction logging

### 2. Discord Bot /adjustpoints Command

**Command**: `/adjustpoints @user [points] [reason]`

**Parameters**:
- `@user` (required): The Discord user to adjust points for
- `points` (required): Points to add (positive) or subtract (negative)
- `reason` (optional): Explanation for the adjustment

**Access**: Admin and Core roles only

**Response**: Beautiful embed showing:
- Adjustment amount (green for positive, red for negative)
- New balance
- Previous balance
- Reason for adjustment
- Who made the adjustment and when

## Transaction Logging

All point adjustments are logged with:
- Unique transaction ID
- User information (Discord ID and Twitter handle)
- Points changed (+/-)
- Previous and new balance
- Timestamp (in EDT)
- Admin who made the change
- Reason for adjustment

## API Endpoint

**Endpoint**: `/api/engagement/adjust-points`

**Method**: POST

**Required**: Admin or Core role

**Payload**:
```json
{
  "discordId": "user's discord id",
  "points": 100,  // positive or negative
  "reason": "Bonus for excellent engagement"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully adjusted +100 points",
  "newBalance": 600,
  "transaction": {
    "id": "adj_1234567890_abc123",
    "previousBalance": 500,
    "newBalance": 600,
    // ... other transaction details
  }
}
```

## Security Features

1. **Role-based access**: Only Admin and Core roles can adjust points
2. **Session validation**: API requires authenticated session
3. **Input validation**: Prevents invalid point values
4. **Audit trail**: All adjustments are permanently logged
5. **Balance protection**: Points cannot go below 0

## Use Cases

1. **Rewards**: Award bonus points for special contributions
2. **Corrections**: Fix point calculation errors
3. **Penalties**: Deduct points for rule violations
4. **Incentives**: Give starter points to new users
5. **Contests**: Award contest prizes

## Example Usage

### Discord Bot
```
/adjustpoints @navlld 500 Welcome bonus for new users
```

### Admin Panel
1. Navigate to Admin > Engagement > Settings
2. Find the user in the Opted-In Users table
3. Click their points value (e.g., "0")
4. Type new value (e.g., "500")
5. Click "Save"
6. Confirmation: "Successfully adjusted points for @navlld. New balance: 500 points"

## Implementation Details

### Files Modified
1. `app/admin/engagement/page.tsx` - Added editable points UI
2. `app/api/engagement/adjust-points/route.ts` - Created API endpoint
3. `discord-bots/engagement-bot.js` - Added /adjustpoints command

### Data Storage
- Points stored in: `engagement:connection:{discordId}` under `totalPoints` field
- Transactions stored in: `engagement:transaction:{transactionId}`
- Transaction index: `engagement:transactions:recent` (sorted set)

## Notes

- All adjustments appear in the "Recent Points Transactions" section
- The system uses EDT timezone for all timestamps
- Points are immediately reflected across all systems
- Discord bot must be restarted after code changes to load new commands 