# Session Issue Diagnosis

## The Problem
You're still getting 403 errors because your browser has a cached JWT token with the old role.

## Current State
- ✅ **Database**: Your role is correctly set to `'core'`
- ❌ **JWT Token**: Still has cached role `'user'`
- ❌ **API Calls**: Failing with 403 because token says you're a `'user'`

## Why This Happens
NextAuth uses JWT tokens for performance:
- User data (including role) is stored in the JWT token
- Tokens don't refresh automatically when database changes
- This prevents constant database lookups but means role changes need re-authentication

## The Solution

### You MUST log out and log back in:

1. **Click your profile icon** → **Log out**
2. **Log back in with Twitter**
3. Your JWT token will refresh with the correct `'core'` role
4. The 403 errors will stop immediately

### That's it! No other changes needed.

## What Will Work After Re-login
- ✅ Add/edit links in KOL campaigns
- ✅ Full core permissions
- ✅ Edit profile button (for KOLs with user accounts)
- ✅ All core role features

## Technical Details Added
I've added detailed logging to the API endpoint so you can see exactly what's happening:
- Shows your current role from the JWT token
- Shows authentication status
- Shows why access is denied

This will help debug any future issues. 