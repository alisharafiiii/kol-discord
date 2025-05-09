#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

// Get credentials
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

// Print credential info
console.log('TWITTER CREDENTIALS TEST');
console.log('========================');
console.log(`Client ID: ${TWITTER_CLIENT_ID ? TWITTER_CLIENT_ID.substring(0, 8) + '...' : 'NOT FOUND'}`);
console.log(`Client Secret: ${TWITTER_CLIENT_SECRET ? TWITTER_CLIENT_SECRET.substring(0, 8) + '...' : 'NOT FOUND'}`);

// Create basic auth header like Twitter expects
if (TWITTER_CLIENT_ID && TWITTER_CLIENT_SECRET) {
  const credentials = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
  console.log(`\nBasic auth header: Basic ${credentials.substring(0, 10)}...`);
  
  console.log('\nTwitter Developer Portal Tips:');
  console.log('1. Check that your app has OAuth 2.0 enabled');
  console.log('2. Verify callback URL is exactly: http://localhost:3000/api/auth/callback/twitter');
  console.log('3. Ensure your app has the correct permissions (tweet.read, users.read, offline.access)');
  console.log('4. Make sure your Developer account email is verified');
  console.log('\nYour Next.js callback URL should match the one in Twitter Developer Portal');
} else {
  console.log('\nERROR: Missing credentials in .env.local file');
  console.log('Please ensure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are set');
} 