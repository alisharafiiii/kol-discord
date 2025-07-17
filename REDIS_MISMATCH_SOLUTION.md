# Discord /connect Redis Mismatch - Critical Issue Diagnosis

## 🔴 ROOT CAUSE IDENTIFIED

There's a **Redis instance mismatch** between your services:

### Current State:
- **Discord Bot (Railway)**: Using OLD Redis (`polished-vulture-15957`)
- **Next.js App (Vercel)**: Likely using OLD Redis (`polished-vulture-15957`) 
- **Local Development**: Using NEW Redis (`caring-spider-49388`)

### Evidence:
1. Bot log shows: `Connecting to main Redis instance: polished-vulture-15957.upstash.io`
2. Old Redis has 8 expired Discord sessions
3. New Redis has 0 Discord sessions

## ✅ IMMEDIATE SOLUTION

### Step 1: Verify Current Vercel Variables
```bash
npx vercel env ls UPSTASH_REDIS_REST_URL
npx vercel env ls UPSTASH_REDIS_REST_TOKEN
```

### Step 2: Update Railway Environment Variables
1. Go to Railway Dashboard → Your Project → Variables
2. Update these variables:
   ```
   REDIS_URL=redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379
   UPSTASH_REDIS_REST_URL=https://caring-spider-49388.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA
   ```

### Step 3: Update Vercel Environment Variables (if needed)
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Ensure these are set:
   ```
   UPSTASH_REDIS_REST_URL=https://caring-spider-49388.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA
   ```

### Step 4: Restart Services
- Railway: Will restart automatically after env var changes
- Vercel: Trigger a new deployment

## 🧪 VERIFICATION STEPS

### 1. Quick Redis CLI Test
```bash
# Test session creation on NEW Redis
redis-cli -u redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379 --tls SET "discord:verify:test-$(date +%s)" '{"test":true}' EX 300
```

### 2. Monitor Real-time Sessions
Run the debug script I created:
```bash
node debug-discord-session.js
```
Then use `/connect` in Discord and watch which Redis instance gets the session.

### 3. Create Debug Endpoint
Add this temporary endpoint to verify Redis from Vercel:

```typescript
// app/api/debug/redis-check/route.ts
import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET() {
  try {
    const testKey = `debug:${Date.now()}`
    await redis.set(testKey, 'test', 'EX', 10)
    const value = await redis.get(testKey)
    
    const sessions = await redis.keys('discord:verify:*')
    
    return NextResponse.json({
      connected: true,
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
      testWrite: value === 'test',
      discordSessions: sessions.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error.message,
      redisUrl: process.env.UPSTASH_REDIS_REST_URL
    }, { status: 500 })
  }
}
```

## 🚨 IMPORTANT NOTES

1. **DO NOT** create a new Redis instance
2. **DO NOT** mix Redis instances between services
3. All services MUST use the same Redis instance
4. The OLD Redis (`polished-vulture-15957`) appears to be deprecated/inactive

## 📊 Expected Result After Fix

When everything is correctly configured:
1. Discord bot creates session in NEW Redis
2. Vercel app reads session from NEW Redis
3. Authentication flow completes successfully 