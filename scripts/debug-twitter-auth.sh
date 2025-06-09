#!/bin/bash

echo "🔍 Debugging Twitter OAuth Setup"
echo "================================"
echo ""

# Check environment variables
echo "1. Checking environment variables..."
if grep -q "TWITTER_CLIENT_ID" .env.local && grep -q "TWITTER_CLIENT_SECRET" .env.local; then
    echo "✅ Twitter credentials are configured"
else
    echo "❌ Twitter credentials missing in .env.local"
fi

if grep -q "NEXTAUTH_URL=http://localhost:3000" .env.local; then
    echo "✅ NEXTAUTH_URL is set to http://localhost:3000"
else
    echo "⚠️  NEXTAUTH_URL might be incorrect"
    grep "NEXTAUTH_URL" .env.local
fi

echo ""
echo "2. Testing Twitter API connection..."
# Extract bearer token
BEARER_TOKEN=$(grep "TWITTER_BEARER_TOKEN" .env.local | cut -d'=' -f2)
if [ ! -z "$BEARER_TOKEN" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $BEARER_TOKEN" "https://api.twitter.com/2/users/me")
    if [ "$response" = "200" ]; then
        echo "✅ Bearer token is valid"
    else
        echo "❌ Bearer token test failed (HTTP $response)"
    fi
else
    echo "⚠️  No Bearer token configured"
fi

echo ""
echo "3. Required Twitter App Settings:"
echo "================================"
echo "Go to: https://developer.twitter.com/en/portal/dashboard"
echo ""
echo "In your app's 'User authentication settings', ensure:"
echo ""
echo "✓ OAuth 2.0 is ENABLED"
echo "✓ Type of App: Web App"
echo "✓ Callback URI includes:"
echo "  http://localhost:3000/api/auth/callback/twitter"
echo ""
echo "✓ Website URL:"
echo "  http://localhost:3000"
echo ""
echo "✓ Required scopes:"
echo "  - tweet.read"
echo "  - users.read"
echo "  - offline.access (for refresh tokens)"
echo ""
echo "4. Common Issues:"
echo "================"
echo "• Callback URL mismatch (must be EXACT, including http://)"
echo "• OAuth 2.0 not enabled in Twitter app"
echo "• Browser blocking popups"
echo "• Ad blockers interfering"
echo ""
echo "5. To test manually:"
echo "==================="
echo "1. Open http://localhost:3000 in an incognito window"
echo "2. Open browser DevTools (F12)"
echo "3. Try to sign in with Twitter"
echo "4. Check Console and Network tabs for errors"
echo "" 