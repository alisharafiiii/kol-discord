# Fix Discord Link Error - Update Redis Configuration

## The Problem
Your Discord bot and web app are using different Redis instances:
- **Discord Bot**: Using new Redis at `https://caring-spider-49388.upstash.io`
- **Web App**: Still using old Redis (likely `polished-vulture-15957.upstash.io`)

## Solution: Update Redis Credentials

### 1. Update .env.local (for local development)
Open your `.env.local` file and update these values:

```env
UPSTASH_REDIS_REST_URL=https://caring-spider-49388.upstash.io
UPSTASH_REDIS_REST_TOKEN=AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA
```

### 2. Update Vercel Environment Variables (for production)
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Update these variables:
   - `UPSTASH_REDIS_REST_URL` = `https://caring-spider-49388.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA`

### 3. Restart Your Application
After updating the environment variables:
- **Local**: Restart your Next.js dev server (`npm run dev`)
- **Production**: Redeploy on Vercel (will happen automatically after updating env vars)

## Verify the Fix
1. Try the Discord connect command again
2. The session should now be found correctly
3. Discord-Twitter linking should work

## Alternative: Check API Route
If the 404 error persists, verify that the API route exists: 