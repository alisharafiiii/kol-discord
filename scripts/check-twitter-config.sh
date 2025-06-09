#!/bin/bash

echo "🔍 Checking Twitter OAuth Configuration"
echo "======================================"
echo ""

# Check environment variables
echo "1. Environment Variables:"
echo "------------------------"
if [ -f .env.local ]; then
    echo "NEXTAUTH_URL: $(grep "NEXTAUTH_URL" .env.local | cut -d'=' -f2)"
    echo "TWITTER_CLIENT_ID: $(grep "TWITTER_CLIENT_ID" .env.local | cut -d'=' -f2 | cut -c1-10)..."
    echo ""
else
    echo "❌ .env.local not found!"
fi

echo "2. Current OAuth Flow URLs:"
echo "---------------------------"
echo "For LOCAL development (port 3002):"
echo "  Callback URL: http://localhost:3002/api/auth/callback/twitter"
echo ""
echo "For Vercel deployment:"
echo "  Callback URL: https://kol-test-nabus-projects-b8bca9ec.vercel.app/api/auth/callback/twitter"
echo ""

echo "3. Required Twitter App Settings:"
echo "---------------------------------"
echo "Go to: https://developer.twitter.com/en/portal/dashboard"
echo ""
echo "Select your app and check:"
echo ""
echo "a) User authentication settings:"
echo "   ✓ OAuth 2.0 MUST be enabled"
echo "   ✓ Type of App: Web App, Automated App or Bot"
echo ""
echo "b) App permissions:"
echo "   ✓ Read (minimum)"
echo ""
echo "c) Callback URLs (add ALL of these):"
echo "   • http://localhost:3000/api/auth/callback/twitter"
echo "   • http://localhost:3002/api/auth/callback/twitter"
echo "   • https://kol-test-nabus-projects-b8bca9ec.vercel.app/api/auth/callback/twitter"
echo ""
echo "d) Website URL:"
echo "   • https://kol-test-nabus-projects-b8bca9ec.vercel.app"
echo ""
echo "e) Terms of service URL (optional but recommended):"
echo "   • https://kol-test-nabus-projects-b8bca9ec.vercel.app/terms"
echo ""
echo "f) Privacy policy URL (optional but recommended):"
echo "   • https://kol-test-nabus-projects-b8bca9ec.vercel.app/privacy"
echo ""

echo "4. Common 400 Error Causes:"
echo "---------------------------"
echo "❌ OAuth 2.0 not enabled in Twitter app"
echo "❌ Callback URL mismatch (even one character off)"
echo "❌ App suspended or in restricted mode"
echo "❌ Invalid Client ID/Secret pair"
echo "❌ App not approved for the requested scopes"
echo ""

echo "5. Quick Verification Steps:"
echo "----------------------------"
echo "1. In Twitter Developer Portal, click 'Keys and tokens'"
echo "2. Regenerate your OAuth 2.0 Client ID and Client Secret"
echo "3. Update your .env.local with the new credentials"
echo "4. Restart your dev server"
echo ""

echo "6. Test OAuth URL directly:"
echo "---------------------------"
echo "Try opening this URL in your browser:"
CLIENT_ID=$(grep "TWITTER_CLIENT_ID" .env.local 2>/dev/null | cut -d'=' -f2)
if [ ! -z "$CLIENT_ID" ]; then
    echo "https://twitter.com/i/oauth2/authorize?response_type=code&client_id=$CLIENT_ID&redirect_uri=https%3A%2F%2Fkol-test-nabus-projects-b8bca9ec.vercel.app%2Fapi%2Fauth%2Fcallback%2Ftwitter&scope=users.read%20tweet.read%20offline.access&state=test&code_challenge=test&code_challenge_method=plain"
else
    echo "❌ Could not read TWITTER_CLIENT_ID"
fi
echo ""
echo "If this URL gives an error, the issue is with your Twitter app configuration." 