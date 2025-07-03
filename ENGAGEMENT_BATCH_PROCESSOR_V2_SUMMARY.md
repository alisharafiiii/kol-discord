# Engagement Batch Processor v2 Summary

## Overview
The engagement batch processor has been updated to optimize for the Basic Twitter API limits and run on an hourly schedule.

## Key Changes

### 1. Rate Limiting Optimization
- **API Limit**: 120 requests per hour (Basic Twitter API)
- **Max Tweets per Batch**: 60 tweets (2 API calls per tweet = 120 requests)
- **Window Duration**: 1 hour

### 2. API Calls per Tweet
Each tweet now uses exactly 2 API calls:
1. **retweeted_by**: Fetches users who retweeted the tweet
2. **search/recent**: Fetches replies using conversation_id

### 3. Processing Schedule
- **Frequency**: Runs every hour at :00 (e.g., 1:00, 2:00, 3:00, etc.)
- **Time Range**: Processes tweets from the last 24 hours
- **Deduplication**: Awards points only to users who haven't received them yet

### 4. Points System
Points are awarded based on user tiers with automatic like points:
- **Retweet**: Awards retweet points + like points (if not already awarded)
- **Reply**: Awards reply points + like points (if not already awarded)

### 5. Enhanced Logging
- Clear console output with emojis for better readability
- Detailed file logging in `logs/batch_processor_logs/`
- Comprehensive batch summaries including:
  - Total tweets processed
  - Engagements found (retweets/replies)
  - Points awarded
  - API calls used
  - Unique users engaged
  - Processing duration

### 6. Rate Limit Handling
- Checks rate limit before each API call
- Gracefully handles rate limit errors
- Waits for reset period if limit exceeded
- Shows rate limit status after each batch

### 7. Redis Updates
- Stores batch status for UI display
- Maintains last 10 batch summaries
- Updates tweet metrics
- Tracks awarded points to prevent duplicates

## Files Created/Modified

### New Files
- `discord-bots/engagement-batch-processor-v2.js` - Main batch processor
- `discord-bots/engagement-cron-v2.js` - Hourly cron scheduler

### PM2 Process
- Process Name: `engagement-cron-v2`
- Memory Limit: 500MB
- Auto-restart on failure

## Running the Processor

### Start
```bash
pm2 start discord-bots/engagement-cron-v2.js --name engagement-cron-v2 --max-memory-restart 500M
```

### Monitor
```bash
pm2 logs engagement-cron-v2
```

### Stop
```bash
pm2 stop engagement-cron-v2
```

### Manual Run
```bash
cd discord-bots
node engagement-batch-processor-v2.js
```

## Expected Behavior

1. On startup: Runs initial batch immediately
2. Every hour: Processes up to 60 tweets from last 24 hours
3. Each tweet: Makes 2 API calls (retweets + replies)
4. Points: Awards only to new engagements
5. Logging: Comprehensive summaries in console and files

## Rate Limit Management

With 120 API calls per hour and 2 calls per tweet:
- Maximum tweets per hour: 60
- If more than 60 tweets exist, oldest are processed first
- Remaining tweets processed in next hourly batch
- Rate limit resets every hour

## Error Handling

- Retries failed API calls with exponential backoff
- Continues processing if individual tweets fail
- Logs all errors for debugging
- Gracefully handles rate limit errors

This implementation ensures reliable engagement tracking while staying well within Twitter's Basic API limits. 