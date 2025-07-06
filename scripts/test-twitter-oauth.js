const https = require('https');

console.log('🔍 Testing Twitter OAuth Configuration...\n');

// Check environment variables
const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set in environment variables');
  process.exit(1);
}
const CALLBACK_URL = 'http://localhost:3000/api/auth/callback/twitter';

console.log('📋 OAuth Configuration:');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Client Secret: ${CLIENT_SECRET.substring(0, 10)}...`);
console.log(`Callback URL: ${CALLBACK_URL}`);
console.log('');

// Instructions for Twitter App configuration
console.log('⚙️  Twitter App Configuration Requirements:\n');
console.log('1. Go to https://developer.twitter.com/en/portal/projects-and-apps');
console.log('2. Select your app');
console.log('3. Go to "User authentication settings"');
console.log('4. Make sure OAuth 2.0 is enabled');
console.log('5. Add these Callback URLs:');
console.log('   - http://localhost:3000/api/auth/callback/twitter');
console.log('   - http://127.0.0.1:3000/api/auth/callback/twitter');
console.log('6. Set "Type of App" to: Web App');
console.log('7. Save the settings');
console.log('');

console.log('🔧 Common Issues:');
console.log('1. ❌ "client_id is required" - OAuth 2.0 not enabled in Twitter app');
console.log('2. ❌ "Callback URL mismatch" - Add the exact URLs above to Twitter app');
console.log('3. ❌ "Invalid client" - Check Client ID and Secret are correct');
console.log('');

console.log('📝 Current NextAuth callback URL format:');
console.log('   http://localhost:3000/api/auth/callback/twitter');
console.log('');
console.log('⚠️  Make sure this EXACT URL is added to your Twitter app!'); 