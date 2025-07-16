# Discord Link Fix Summary

## Issue
The Discord `/connect` command was failing with "Verification session expired or not found" (404 error).

## Root Causes

1. **Redis Instance Mismatch**
   - The engagement bot was hardcoded to use the wrong Redis instance (`caring-spider-49388`)
   - The web app was using the main Redis instance (`polished-vulture-15957`)
   - Sessions created by the bot couldn't be found by the web app

2. **Incorrect Redis Syntax**
   - The bot was using `redis.setex()` which isn't exposed by the ResilientRedis wrapper
   - Should use `redis.set(key, value, { ex: 600 })` with lowercase 'ex' for Upstash Redis

## Fixes Applied

1. **Updated Bot Redis Configuration**
   ```javascript
   // Before:
   const redis = new ResilientRedis({
     url: 'https://caring-spider-49388.upstash.io',
     token: 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA'
   })
   
   // After:
   const redis = new ResilientRedis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN
   })
   ```

2. **Fixed Redis Session Storage**
   ```javascript
   // Before:
   await redis.setex(sessionKey, 600, JSON.stringify({...}))
   
   // After:
   await redis.set(sessionKey, JSON.stringify({...}), { ex: 600 })
   ```

3. **Created Restart Script**
   - `restart-engagement-bot.sh` ensures the bot starts with correct environment variables
   - Loads Redis credentials from `.env.local`
   - Properly stops old process before starting new one

## Verification

Run the debug script to verify Redis connection:
```bash
node debug-discord-link.js
```

This will:
- Test Redis connection
- Create and retrieve test sessions
- Show existing verification sessions
- Display the correct Redis credentials to use

## Testing

1. Go to Discord
2. Use the `/connect` command
3. Click the authentication link
4. Complete Twitter OAuth
5. The connection should now work correctly

## Important Notes

- Both the bot and web app MUST use the same Redis instance
- The main Redis instance URL: `https://polished-vulture-15957.upstash.io`
- Sessions expire after 10 minutes (600 seconds)
- Old expired sessions (TTL -1) can be ignored or cleaned up manually 