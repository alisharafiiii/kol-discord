# Engagement Bot Tweet Submission Fix

## Problem Summary
The Discord bot's `/connect` command works fine, and the leaderboard displays correctly, but users receive an error when trying to submit tweets after linking their Discord account.

## Root Causes Identified

### 1. **Missing Tier Configurations**
The engagement system factory reset cleared all tier configurations. Without these, the bot cannot determine:
- Submission costs (how many points to deduct)
- Daily limits (how many tweets allowed per day)
- Reward amounts (points for likes/retweets/replies)

### 2. **Redis Instance Mismatch**
- The `.env.local` file still points to the old Redis instance: `polished-vulture-15957.upstash.io`
- This instance is no longer available (connection resets)
- The engagement bot needs the new Redis credentials

### 3. **Zero Initial Points**
- Users who connect start with 0 points
- Cannot submit tweets without points (micro tier costs 500 points)

## Complete Fix Steps

### Step 1: Update Redis Configuration

Update `.env.local` with the new Redis credentials:

```bash
# Replace the old Redis URL
REDIS_URL=redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379

# Update Upstash credentials  
UPSTASH_REDIS_REST_TOKEN="AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA"
UPSTASH_REDIS_REST_URL="https://caring-spider-49388.upstash.io"
```

### Step 2: Set Up Tier Configurations

Run the tier setup script:

```bash
# Load env vars and run setup
export $(cat .env.local | grep -v '^#' | xargs) && node setup-tier-configs.js
```

This creates configurations for all tiers:
- **Micro**: 500 points/tweet, 5 tweets/day
- **Nano**: 300 points/tweet, 10 tweets/day  
- **Mid**: 200 points/tweet, 20 tweets/day
- **Macro**: 100 points/tweet, 50 tweets/day
- **Mega**: 50 points/tweet, 100 tweets/day

### Step 3: Grant Initial Points

Give users starting points:

```bash
# Grant 1000 points to all users
export $(cat .env.local | grep -v '^#' | xargs) && node grant-initial-points.js

# Or grant custom amount (e.g., 5000 points)
export $(cat .env.local | grep -v '^#' | xargs) && node grant-initial-points.js 5000
```

### Step 4: Verify System Health

Check that everything is configured correctly:

```bash
export $(cat .env.local | grep -v '^#' | xargs) && node check-engagement-health.js
```

### Step 5: Restart Engagement Bot

```bash
cd discord-bots
pm2 restart engagement-bot
# or
pm2 stop engagement-bot
pm2 start engagement-bot.js --name "engagement-bot"
```

## Debugging Specific User Issues

If a specific user still has issues after the fix:

```bash
# Debug a specific Discord user
export $(cat .env.local | grep -v '^#' | xargs) && node debug-tweet-submission.js <discord-id>

# Example:
export $(cat .env.local | grep -v '^#' | xargs) && node debug-tweet-submission.js 123456789012345678
```

## What This Fixes

1. ✅ Bot can now determine submission costs
2. ✅ Users have points to submit tweets
3. ✅ Proper tier configurations for rewards
4. ✅ Redis connection working properly
5. ✅ Daily limits enforced correctly

## Testing the Fix

1. User runs `/connect` in Discord
2. User runs `/points` - should show 1000+ points
3. User runs `/submit` - modal appears
4. User enters tweet URL - submission succeeds
5. Points are deducted (check with `/points`)
6. Tweet appears in #engagement-tracker channel

## Additional Notes

- Users need at least 500 points for micro tier submissions
- The bot automatically assigns "micro" tier to new users
- Points are earned through engagement (10 per like/retweet/reply)
- Daily submission limits reset at midnight UTC

## Environment Variables Required

Make sure these are set in `.env.local`:

```bash
# Discord Bot
DISCORD_ENGAGEMENT_BOT_TOKEN=your_bot_token

# Redis (new instance)
REDIS_URL=redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379

# Twitter API
TWITTER_BEARER_TOKEN=your_bearer_token
``` 