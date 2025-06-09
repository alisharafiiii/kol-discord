#!/bin/bash

echo "🔍 Checking Redis/Upstash Connection"
echo "===================================="
echo ""

# Check if REDIS_URL is set in .env.local
echo "1. Checking for REDIS_URL in environment..."
if [ -f .env.local ]; then
    REDIS_URL=$(grep "REDIS_URL" .env.local | cut -d'=' -f2)
    if [ ! -z "$REDIS_URL" ]; then
        # Extract hostname from Redis URL
        HOSTNAME=$(echo $REDIS_URL | sed -E 's|redis://.*@([^:]+):.*|\1|')
        echo "✅ REDIS_URL found"
        echo "   Hostname: $HOSTNAME"
        
        # Test DNS resolution
        echo ""
        echo "2. Testing DNS resolution for Redis host..."
        if nslookup "$HOSTNAME" > /dev/null 2>&1; then
            echo "✅ DNS resolution successful"
        else
            echo "❌ DNS resolution FAILED for: $HOSTNAME"
            echo "   Error: getaddrinfo ENOTFOUND"
        fi
        
        # Test Redis connection
        echo ""
        echo "3. Testing Redis connection..."
        # Extract password and port
        PASSWORD=$(echo $REDIS_URL | sed -E 's|redis://default:([^@]+)@.*|\1|')
        PORT=$(echo $REDIS_URL | sed -E 's|.*:([0-9]+)$|\1|')
        
        # Try to ping Redis
        if command -v redis-cli &> /dev/null; then
            echo "   Using redis-cli to test connection..."
            redis-cli -h "$HOSTNAME" -p "$PORT" -a "$PASSWORD" ping 2>/dev/null && echo "✅ Redis connection successful" || echo "❌ Redis connection failed"
        else
            echo "   redis-cli not installed, trying with curl..."
            curl -s "https://$HOSTNAME:$PORT" > /dev/null 2>&1 && echo "✅ Host is reachable" || echo "❌ Host is not reachable"
        fi
    else
        echo "❌ REDIS_URL not found in .env.local"
    fi
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "4. Common Issues:"
echo "=================="
echo "• 'unified-bluegill-48912.upstash.io' cannot be resolved"
echo "  → This Upstash instance might have been deleted or renamed"
echo "  → Check your Upstash dashboard: https://console.upstash.com/"
echo ""
echo "• How to fix:"
echo "  1. Go to https://console.upstash.com/"
echo "  2. Create a new Redis database (if needed)"
echo "  3. Copy the new REDIS_URL"
echo "  4. Update your .env.local file"
echo "  5. Update Vercel environment variables"
echo ""
echo "• Alternative: Use a mock Redis for local development"
echo "  You can temporarily comment out Redis calls while developing"

echo ""
echo "5. For Vercel Deployment:"
echo "========================="
echo "Make sure REDIS_URL is set in your Vercel project:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project"
echo "3. Go to Settings → Environment Variables"
echo "4. Add/Update REDIS_URL with a valid Upstash URL" 