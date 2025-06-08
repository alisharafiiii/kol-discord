#!/bin/bash

echo "🔧 Restoring environment variables..."

cat > .env.local << 'EOF'
# Twitter OAuth (NextAuth)
TWITTER_CLIENT_ID=WFVqeHRGbGdaQnlyQVJlOG5PQ1A6MTpjaQ
TWITTER_CLIENT_SECRET=OdKx3LANqE0pEQYYqoaLmT4ecCuI5wvZvOhUrpCCr7tnFHoQPJ
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=f4kYPpKruJG/VYNEvP1XJNkcFf3vmLHDbUqCcz8BYXM=

# Twitter API Bearer Token
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAC7gxAEAAAAA0%2Fw19Lx1lkKP4UjXyh7HcIFLsas%3D1VlIiCXd3hzJXrssQCHxKN5lkkQQgETMOIOqNNGvbMN6eUqaHl

# Redis Configuration
REDIS_URL=redis://default:AY-KAAQAABAAAAI0YjY0MGJjNGI2MDk0YzllYTMxM2U5MDllMzU1ZjQ4NnAxMA@unified-bluegill-48912.upstash.io:6379

# Mock Redis Flag
USE_MOCK_REDIS=true

# SMTP Configuration for Email Notifications
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=notifications@nabulines.com
SMTP_PASS=NabuL1n3s2024!
SMTP_FROM=notifications@nabulines.com
EOF

echo "✅ Environment variables restored!"
echo ""
echo "⚠️  Note: USE_MOCK_REDIS=true is set because your Redis instance is currently offline."
echo "   Remove this line when your Upstash Redis is back online."
echo ""
echo "🔄 Please restart your Next.js server for changes to take effect." 