# Deploy to Test Vercel Project

This guide helps you deploy your current code to a new Vercel project for testing without affecting your production site.

## Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Run the deployment script**:
   ```bash
   chmod +x scripts/deploy-test.sh
   ./scripts/deploy-test.sh
   ```

## Option 2: Using Vercel Dashboard

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Test deployment"
   git push
   ```

2. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

3. **Import your repository**:
   - Select your GitHub repository
   - **IMPORTANT**: Change the project name to `kol-test` (or another name)
   - Click "Deploy"

4. **After initial deployment, add environment variables**:
   - Go to your new project settings
   - Navigate to "Environment Variables"
   - Add ALL these variables from your production project:

   ```
   TWITTER_CLIENT_ID=<copy from production>
   TWITTER_CLIENT_SECRET=<copy from production>
   NEXTAUTH_URL=https://your-test-domain.vercel.app
   NEXTAUTH_SECRET=<copy from production>
   TWITTER_BEARER_TOKEN=<copy from production>
   REDIS_URL=<copy from production - this shares the database>
   SMTP_HOST=<copy from production>
   SMTP_PORT=<copy from production>
   SMTP_USER=<copy from production>
   SMTP_PASS=<copy from production>
   SMTP_FROM=<copy from production>
   ```

5. **Redeploy** to apply environment variables:
   - Go to "Deployments" tab
   - Click "..." on the latest deployment
   - Select "Redeploy"

## Important Notes

### ✅ What's Safe:
- Both sites will use the **same Redis database** (your real data)
- Changes to code won't affect production
- You can test all features safely

### ⚠️ What to Remember:
1. **Update NEXTAUTH_URL** to your test domain (e.g., `https://kol-test.vercel.app`)
2. **Twitter OAuth**: You might need to add the test domain to your Twitter app callbacks:
   - Add: `https://your-test-domain.vercel.app/api/auth/callback/twitter`
3. **Don't use production domain** in NEXTAUTH_URL for the test site

### 🔧 Twitter OAuth Fix for Test Site:
In your Twitter Developer Portal:
1. Go to your app settings
2. Add your test callback URL:
   - `https://your-test-domain.vercel.app/api/auth/callback/twitter`
3. Save changes

Now you can test everything on the test domain before deploying to production! 