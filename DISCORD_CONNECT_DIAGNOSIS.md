# Discord /connect Issue Diagnosis

## What's Happening

1. User clicks `/connect` in Discord ✅
2. Bot shows button with link to `https://www.nabulines.com/auth/discord-link?session=...` ✅
3. User clicks button and authenticates with Twitter ✅
4. Page tries to complete linking but gets error: "Verification session expired or not found" ❌

## Root Cause

The Discord session is not being found in Redis when the web app tries to retrieve it. This could be because:

1. The bot failed to create the session in Redis
2. The session expired (unlikely - they last 10 minutes)
3. There's a mismatch in how the session is stored vs retrieved

## Immediate Actions

### 1. Monitor Sessions in Real-Time
Run this command and then try `/connect` in Discord:
```bash
node monitor-discord-sessions.js
```

This will show if the bot is successfully creating sessions in Redis.

### 2. Check Bot Errors
The bot might be failing to store sessions. Check if there are any errors when you use `/connect`.

### 3. Verify Redis Connection
The bot shows "✅ Redis connection established" in logs, but it might still fail when storing data.

## Current State

- Bot is running with correct session format (reverted back to original)
- API route exists and expects: `discordId`, `discordUsername`, `discordTag`
- 30 expired sessions were cleaned up
- Redis is accessible (caring-spider instance)

## Next Steps

1. **Run the monitor** to see if sessions are being created
2. **Try /connect again** while monitoring
3. **Check bot console** for any errors when you click the button

If sessions ARE being created but still failing, the issue is in retrieval.
If sessions are NOT being created, the issue is in the bot's Redis storage.

## Quick Test

You can manually create a test session and see if the linking works:
```bash
node test-session-creation.js
```

This will give you a URL to test with a properly formatted session. 