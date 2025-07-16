#!/bin/bash

echo "🔄 Restarting Discord Engagement Bot with correct Redis credentials"
echo "===================================================================="

# Kill existing bot process
echo "1️⃣ Stopping existing bot process..."
pkill -f "node.*engagement-bot.js" || echo "   No existing process found"

# Wait a moment
sleep 2

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    echo "2️⃣ Loading environment from .env.local..."
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ .env.local not found!"
    echo "   Please create .env.local with:"
    echo "   UPSTASH_REDIS_REST_URL=https://polished-vulture-15957.upstash.io"
    echo "   UPSTASH_REDIS_REST_TOKEN=your-token-here"
    exit 1
fi

# Verify Redis credentials
if [ -z "$UPSTASH_REDIS_REST_URL" ] || [ -z "$UPSTASH_REDIS_REST_TOKEN" ]; then
    echo "❌ Missing Redis credentials in .env.local!"
    exit 1
fi

echo "3️⃣ Starting bot with Redis URL: ${UPSTASH_REDIS_REST_URL:0:30}..."

# Start the bot
cd discord-bots
nohup node engagement-bot.js > engagement-bot.log 2>&1 &

echo "4️⃣ Bot started! PID: $!"
echo ""
echo "✅ Bot is now running with the correct Redis instance"
echo "   Check logs: tail -f discord-bots/engagement-bot.log"
echo ""
echo "5️⃣ Testing Discord /connect command..."
echo "   1. Go to Discord"
echo "   2. Type /connect"
echo "   3. Click the link to authenticate with Twitter"
echo "   4. The session should now be found correctly" 