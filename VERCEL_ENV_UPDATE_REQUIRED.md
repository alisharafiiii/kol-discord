# 🚨 URGENT: Update Vercel Environment Variables

## The Problem
- Bot creates Discord sessions in **caring-spider** Redis ✅
- Web app looks for sessions in **different Redis** (old instance) ❌
- Result: "Verification session expired or not found"

## Confirmed
The session `verify-918575895374082078-1752707098961` EXISTS in caring-spider Redis with correct data, but your Vercel deployment can't find it because it's using different Redis credentials.

## Solution: Update Vercel Environment Variables

### 1. Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Select your project (nabulines)
- Go to Settings → Environment Variables

### 2. Update These Variables
```
REDIS_URL = redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379

UPSTASH_REDIS_REST_URL = https://caring-spider-49388.upstash.io

UPSTASH_REDIS_REST_TOKEN = AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA
```

### 3. Redeploy
- After updating, trigger a new deployment
- Or push any small change to trigger auto-deploy

## Why This Happened
When we fixed the tweet submission issue, we updated the local `.env.local` to use the new Redis instance (caring-spider), but the Vercel deployment still has the old Redis credentials.

## Current State
- ✅ Bot uses caring-spider Redis
- ✅ Local development uses caring-spider Redis  
- ❌ Vercel production uses old Redis
- ✅ Tweet submission works (different flow)
- ❌ Discord linking fails (Redis mismatch)

## After Updating Vercel
Discord /connect will work because:
1. Bot creates session in caring-spider ✅
2. Web app will look in caring-spider ✅
3. Session found, linking succeeds ✅

This is the ONLY remaining issue - everything else is correctly configured! 