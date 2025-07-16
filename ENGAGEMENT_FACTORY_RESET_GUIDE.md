# Engagement System Factory Reset Guide

## Overview
This guide documents the complete factory reset process for the engagement bot system, reverting all changes and clearing all data.

## Reset Process Steps

### Step 1: Revert Configuration to Original Settings
```bash
node revert-engagement-system.js
```

This will:
- Restore micro tier submission cost to 500 points
- Remove all tier configurations (mid, macro, mega, giga)
- Remove all point rules
- Clear all performance caches
- Remove all custom indexes

### Step 2: Factory Reset - Clear All Data
```bash
node factory-reset-engagement.js
```

**⚠️ WARNING**: This will permanently DELETE:
- All user connections (42 users)
- All points data (13,235 total points)
- All tweet submissions
- All transaction history
- All batch job records
- All configurations
- Everything related to engagement

The script includes a 5-second delay to allow cancellation.

### Step 3: Verify Reset Complete
```bash
node verify-reset-complete.js
```

This will confirm:
- No user data remains
- No points data remains
- No tweet history remains
- All caches cleared
- System ready for fresh start

## Railway Deployment Steps

### 1. Run Scripts Locally First
Execute the three scripts in order as shown above.

### 2. Restart Bot on Railway
After reset, restart the engagement bot on Railway to ensure it starts fresh.

### 3. Set Original Configuration
If needed, manually set the original tier configuration:

```javascript
// Original micro tier settings
{
  submissionCost: 500,
  minPoints: 0,
  maxPoints: 999,
  canSubmitTweets: true,
  dailySubmitLimit: 5
}
```

## Data Deleted Summary

### User Data
- 42 user connections
- 42 Twitter handle mappings
- All user point balances

### Tweet Data
- All submitted tweets
- All pending tweets
- All tweet interaction logs

### Transaction Data
- All point transactions
- All point deductions
- All bonus point awards

### System Data
- All batch processing jobs
- All daily limit trackers
- All tier configurations
- All scenario rules
- All performance caches
- All custom indexes

## Redis Keys Pattern Reference

| Pattern | Description |
|---------|-------------|
| `engagement:connection:*` | User connections |
| `engagement:twitter:*` | Twitter handle mappings |
| `engagement:tweet:*` | Tweet submissions |
| `engagement:transaction:*` | Point transactions |
| `engagement:batch:*` | Batch processing jobs |
| `engagement:tier-config:*` | Tier configurations |
| `engagement:cache:*` | Performance caches |

## Verification Checklist

- [ ] All user data cleared
- [ ] All points reset to zero
- [ ] All tweets deleted
- [ ] Submission cost back to 500 points
- [ ] No residual data in Redis
- [ ] Bot restarted on Railway
- [ ] Dashboard showing empty state

## Post-Reset Configuration

After factory reset, the system will need:
1. Tier configuration (500 points for micro tier)
2. Point rules configuration
3. Users will need to reconnect via `/connect`
4. New tweets will need to be submitted

## Important Notes

- This process is **IRREVERSIBLE**
- All user progress will be lost
- Users must reconnect their accounts
- Historical data cannot be recovered
- The system returns to a completely fresh state

## Support

If any data remains after reset:
1. Check specific key patterns with `redis.keys('engagement:*')`
2. Manually delete remaining keys
3. Re-run verification script

## Confirmation

By running these scripts, you confirm:
- ✅ You want to completely reset the engagement system
- ✅ You understand all data will be permanently deleted
- ✅ You have authorization to perform this reset
- ✅ The system will return to original 500 point requirement 