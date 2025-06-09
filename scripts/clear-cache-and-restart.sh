#!/bin/bash

echo "🧹 Clearing Next.js cache and restarting..."
echo "=========================================="

# Kill any existing Next.js processes
echo "1. Killing existing Next.js processes..."
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || echo "   No processes to kill"

# Clear Next.js cache
echo ""
echo "2. Clearing Next.js cache..."
rm -rf .next 2>/dev/null && echo "   ✅ .next directory removed" || echo "   No .next directory found"

# Clear node_modules/.cache if it exists
echo ""
echo "3. Clearing node_modules cache..."
rm -rf node_modules/.cache 2>/dev/null && echo "   ✅ node_modules/.cache removed" || echo "   No cache found"

# Clear any session storage
echo ""
echo "4. Session information:"
echo "   When you log in, make sure the session shows:"
echo "   - twitterHandle: sharafi_eth"
echo "   - role: admin"

echo ""
echo "5. Starting fresh development server..."
echo "   Running: npm run dev"
echo ""
echo "=========================================="
echo "After the server starts:"
echo "1. Open http://localhost:3000 in a NEW incognito window"
echo "2. Log in with Twitter (sharafi_eth account)"
echo "3. Go to http://localhost:3000/admin"
echo "4. Check the browser console for debug logs"
echo "=========================================="
echo ""

# Start the dev server
npm run dev 