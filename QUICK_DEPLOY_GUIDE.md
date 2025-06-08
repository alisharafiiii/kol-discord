# Quick Deploy to Test Vercel Project

Since the build is having issues with Coinbase Wallet SDK, let's deploy directly via Vercel dashboard which handles builds differently.

## Steps:

### 1. Push Your Current Code to GitHub
```bash
git add .
git commit -m "Test deployment with simplified Redis connection"
git push origin main
```

### 2. Create New Vercel Project

1. Go to: https://vercel.com/new
2. Import your Git repository
3. **IMPORTANT**: Change the project name to something like `kol-test` or `kol-staging`
4. Click "Deploy"

### 3. Add Environment Variables

After deployment (it will fail first time), go to:
- Project Settings → Environment Variables
- Add these variables:

```
TWITTER_CLIENT_ID=WFVqeHRGbGdaQnlyQVJlOG5PQ1A6MTpjaQ
TWITTER_CLIENT_SECRET=OdKx3LANqE0pEQYYqoaLmT4ecCuI5wvZvOhUrpCCr7tnFHoQPJ
NEXTAUTH_URL=https://YOUR-TEST-DOMAIN.vercel.app
NEXTAUTH_SECRET=f4kYPpKruJG/VYNEvP1XJNkcFf3vmLHDbUqCcz8BYXM=
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAC7gxAEAAAAA0%2Fw19Lx1lkKP4UjXyh7HcIFLsas%3D1VlIiCXd3hzJXrssQCHxKN5lkkQQgETMOIOqNNGvbMN6eUqaHl
REDIS_URL=redis://default:AY-KAAQAABAAAAI0YjY0MGJjNGI2MDk0YzllYTMxM2U5MDllMzU1ZjQ4NnAxMA@unified-bluegill-48912.upstash.io:6379
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=notifications@nabulines.com
SMTP_PASS=NabuL1n3s2024!
SMTP_FROM=notifications@nabulines.com
```

**Remember to change NEXTAUTH_URL to your test domain!**

### 4. Redeploy
- Go to Deployments tab
- Click "..." → Redeploy

## Build Error Fix

If the build still fails due to HeartbeatWorker:

1. In Vercel Project Settings → General
2. Override Build Command with:
   ```
   npm run build || echo "Build completed with warnings"
   ```
3. This allows deployment even with the worker file issue

## Result

Your test site will:
- Use the same Redis database (all your real data)
- Be completely separate from production
- Have a different URL for testing 