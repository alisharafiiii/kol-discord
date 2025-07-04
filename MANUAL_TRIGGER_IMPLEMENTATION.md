# Manual Trigger Implementation for Engagement Bot

## Overview
Added manual trigger functionality to the engagement-cron-v2 bot that allows immediate batch processing while respecting Twitter API rate limits.

## Features

### 1. PM2 Trigger Support
The engagement-cron-v2 process now listens for PM2 messages to trigger manual batch runs.

**Usage:**
```bash
pm2 send 4 manual-run
```
(Note: Use process ID, not name)

### 2. Standalone Trigger Script
Created `trigger-manual-batch.js` for direct manual execution.

**Usage:**
```bash
cd discord-bots
node trigger-manual-batch.js
# or
./trigger-manual-batch.js
```

## Rate Limit Protection

Both methods include comprehensive rate limit checks:

1. **Pre-flight Check**: Verifies current API usage before starting
2. **Minimum Threshold**: Requires at least 4 API calls remaining
3. **Clear Feedback**: Shows current usage and prevents execution if limits exceeded

## Implementation Details

### Code Changes

#### engagement-cron-v2.js
- Added `runManualBatch()` function
- Implements PM2 message listener
- Checks rate limits before processing
- Provides detailed response messages

#### trigger-manual-batch.js
- Standalone script for manual execution
- Direct integration with batch processor
- Comprehensive logging and error handling
- Exit codes for success/failure

### Rate Limit Logic
```javascript
// Check if rate limit allows processing
if (!rateStatus.allowed) {
  console.log(`Cannot run - rate limit exceeded. Reset in ${rateStatus.resetIn} minutes`)
  return
}

// Ensure minimum API calls available
if (rateStatus.remaining < 4) {
  console.log(`Cannot run - only ${rateStatus.remaining} API calls remaining`)
  return
}
```

## Output Examples

### Successful Manual Run:
```
🎯 Manual batch processing triggered at 2025-07-03T16:00:00.000Z
================================================================================
📊 Rate limit check: 10/120 used, 110 remaining
✅ Rate limit check passed, starting batch...
✅ Manual batch completed: 5 tweets, 95 engagements, 450 points
```

### Rate Limit Exceeded:
```
⚠️  Cannot run manual batch - rate limit exceeded. Reset in 45 minutes
```

### Insufficient API Calls:
```
⚠️  Cannot run manual batch - only 3 API calls remaining (need at least 4)
```

## Usage Scenarios

1. **Testing**: Verify engagement tracking without waiting for hourly schedule
2. **On-Demand Processing**: Process important tweets immediately
3. **Recovery**: Manually run after fixing issues or outages
4. **Debugging**: Test with controlled conditions

## Safety Features

- Never exceeds Twitter API rate limits
- Clear logging of all actions
- Graceful error handling
- Status feedback via console
- Prevents accidental API exhaustion

## Monitoring

Check manual run history:
```bash
# View recent manual triggers
grep "Manual batch" ~/.pm2/logs/engagement-cron-v2-out.log

# Check rate limit status
grep "Rate limit" ~/.pm2/logs/engagement-cron-v2-out.log | tail -5
```

## Best Practices

1. Always check current rate limit status before manual runs
2. Leave buffer for scheduled hourly runs
3. Use sparingly to preserve API quota
4. Monitor logs after manual triggers
5. Wait for rate limit reset if exceeded

The manual trigger feature provides flexibility while maintaining the stability and reliability of the engagement tracking system. 