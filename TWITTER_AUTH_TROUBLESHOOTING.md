# Twitter OAuth Troubleshooting Guide

## Current Issue
You're seeing 400 errors from Twitter's API (`api.twitter.com/1.1/onboarding/referrer.json`) when trying to authenticate.

## What We've Added
1. **Enhanced Logging** - The app now logs detailed information at every step of the OAuth flow
2. **Error Page** - `/auth/error` will show specific error codes if authentication fails
3. **Client-Side Logging** - The login button now logs information before initiating OAuth

## How to Debug

### 1. Check Browser Console
When you click "Login with 𝕏", you should see:
```
[LOGIN MODAL] Initiating Twitter sign-in...
[LOGIN MODAL] Current URL: http://localhost:3000
[LOGIN MODAL] NextAuth URL: [should match current URL]
```

### 2. Check Server Console
Look for these logs in your terminal:
```
[NEXTAUTH DEBUG] NextAuth configuration loaded
[NEXTAUTH DEBUG] GET_AUTHORIZATION_URL
[NEXTAUTH DEBUG] === SIGN IN CALLBACK TRIGGERED === (if successful)
```

### 3. Most Common Issues

#### ❌ Callback URL Mismatch
**This is the most likely cause of your 400 error**

Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) and verify:
- **Callback URI** must be EXACTLY: `http://localhost:3000/api/auth/callback/twitter`
- Use `http://` NOT `https://` for localhost
- No trailing slashes
- Case sensitive

#### ❌ OAuth 2.0 Not Enabled
In Twitter App settings, ensure:
- OAuth 2.0 is ENABLED
- Type of App: Web App
- Required scopes: tweet.read, users.read, offline.access

#### ❌ Invalid Credentials
- Check that TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET match your app
- Regenerate credentials if needed

### 4. Quick Test Script
Run this to verify your setup:
```bash
./scripts/debug-twitter-auth.sh
```

### 5. Manual Verification
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Click "Login with 𝕏"
4. Look for the request to `twitter.com/i/oauth2/authorize`
5. Check the redirect_uri parameter - it must match your Twitter app settings

### 6. If Still Failing
The 400 error from `referrer.json` suggests Twitter is rejecting the request before it even gets to your callback. This usually means:
- The referring domain doesn't match your app settings
- The OAuth configuration in Twitter's developer portal is incorrect
- Your app might be suspended or have invalid credentials

### Next Steps
1. Double-check your Twitter app's callback URL
2. Try in an incognito window
3. Check if your Twitter app is active (not suspended)
4. Look at the Network tab in DevTools for the exact error response 