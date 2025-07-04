# Engagement Bot Rate Limit Fix Summary

## Problem
The engagement-cron-v2 bot was repeatedly hitting Twitter API rate limits (120 requests/hour) even when processing only 8 tweets.

## Root Causes Identified

1. **Startup Batch Runs**: The bot ran a batch immediately on every startup
   - Process had been restarted 7 times
   - Each restart triggered an immediate batch processing
   - 7 restarts × 8 tweets × API calls = excessive consumption

2. **Extra API Call**: Each tweet was making 3 API calls instead of 2:
   - Call 1: Fetch retweets (`retweeted_by`)
   - Call 2: Fetch replies (`search`)
   - Call 3: **Unnecessary** fetch tweet metrics (`singleTweet`)

3. **No Rate Limit Checks**: The startup batch didn't check if rate limits were already exhausted

## Fixes Implemented

### 1. Removed Startup Batch Processing
**File**: `discord-bots/engagement-cron-v2.js`
- Removed automatic `processBatch()` call on startup
- Added rate limit status check on startup instead
- Shows when the next scheduled run will occur

### 2. Removed Extra Metrics API Call
**File**: `discord-bots/engagement-batch-processor-v2.js`
- Removed the `singleTweet` API call for fetching metrics
- Now uses exactly 2 API calls per tweet as designed
- Engagement data from retweets/replies is sufficient

### 3. Added Rate Limit Safeguards
**File**: `discord-bots/engagement-batch-processor-v2.js`
- Check rate limit before starting any batch
- Calculate required API calls before processing
- Reduce batch size if insufficient API calls available
- Skip batch entirely if rate limit exceeded

### 4. Enhanced Monitoring
- Show rate limit status on startup
- Log rate limit checks before batch processing
- Display percentage of rate limit used
- Clear error messages when limits exceeded

## Results

### Before Fix:
- Multiple startup runs consuming API calls
- 3 API calls per tweet
- No rate limit awareness
- Hitting 120/hour limit with just 8 tweets

### After Fix:
- No startup batch runs
- 2 API calls per tweet
- Proactive rate limit checking
- Currently using only 24/120 (20%) of hourly limit

## Expected Behavior

1. **On Startup**: 
   - Shows current rate limit status
   - Displays next scheduled run time
   - NO immediate batch processing

2. **Hourly Runs**:
   - Checks rate limit before starting
   - Processes up to 60 tweets (120 API calls)
   - Reduces batch size if needed
   - Skips entirely if rate limited

3. **Rate Limiting**:
   - Tracks all API calls in Redis
   - 1-hour rolling window
   - Maximum 120 API calls per hour
   - Clear logging of usage

## Monitoring Commands

```bash
# Check current status
pm2 logs engagement-cron-v2 --lines 30

# Check rate limit messages
pm2 logs engagement-cron-v2 | grep "rate limit"

# Check process restarts
pm2 describe engagement-cron-v2 | grep restart
```

The bot now operates efficiently within Twitter's Basic API limits without unnecessary API consumption. 