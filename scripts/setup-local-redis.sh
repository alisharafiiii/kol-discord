#!/bin/bash

echo "🔧 Setting up Local Redis for KOL Platform"
echo "========================================="

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis is not installed"
    echo ""
    echo "To install Redis on macOS:"
    echo "  brew install redis"
    echo ""
    echo "To install Redis on Ubuntu/Debian:"
    echo "  sudo apt-get update && sudo apt-get install redis-server"
    echo ""
    exit 1
fi

echo "✅ Redis is installed"

# Check if Redis is running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is already running"
else
    echo "⚠️  Redis is not running"
    echo ""
    echo "Starting Redis..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew services start redis
    else
        # Linux
        sudo systemctl start redis
    fi
    
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis"
        echo "Try starting manually:"
        echo "  redis-server"
        exit 1
    fi
fi

echo ""
echo "📝 Updating .env.local to use local Redis..."

# Backup current .env.local
cp .env.local .env.local.backup

# Update Redis URL to local
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379|' .env.local
else
    # Linux sed
    sed -i 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379|' .env.local
fi

echo "✅ Updated REDIS_URL to: redis://localhost:6379"
echo ""
echo "🎉 Local Redis setup complete!"
echo ""
echo "⚠️  IMPORTANT: Restart your Next.js dev server for changes to take effect"
echo ""
echo "To restore original Redis URL later:"
echo "  cp .env.local.backup .env.local" 