#!/bin/bash

# Test script to simulate bot failure and verify email notifications

echo "🧪 Discord Analytics Bot Failure Test"
echo "===================================="
echo ""
echo "This script will:"
echo "1. Check current bot status"
echo "2. Force stop the bot to trigger email alert"
echo "3. Wait for PM2 to restart it automatically"
echo ""

# Check if PM2 is running
if ! pm2 status > /dev/null 2>&1; then
    echo "❌ PM2 is not running. Please start PM2 first."
    exit 1
fi

echo "📊 Current bot status:"
pm2 status discord-analytics

echo ""
echo "⚠️  About to force stop the bot to test email notifications."
echo "   The bot will be automatically restarted by PM2."
read -p "   Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled."
    exit 0
fi

echo ""
echo "🛑 Force stopping discord-analytics bot..."
pm2 stop discord-analytics --force

echo ""
echo "⏳ Waiting 5 seconds for PM2 to detect the failure..."
sleep 5

echo ""
echo "📊 New bot status (should show 'stopped' or 'restarting'):"
pm2 status discord-analytics

echo ""
echo "📧 Check your email for an alert with subject: 'ALERT: Discord Analytics Bot Stopped'"
echo ""
echo "⏳ Waiting 10 seconds for PM2 to restart the bot..."
sleep 10

echo ""
echo "📊 Final bot status (should show 'online'):"
pm2 status discord-analytics

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Check the admin email inbox for the alert"
echo "2. Verify the bot is running again: pm2 status"
echo "3. Check logs if needed: pm2 logs discord-analytics --lines 50" 