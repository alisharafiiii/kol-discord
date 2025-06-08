const https = require('https');

// Your credentials from .env.local
const CLIENT_ID = 'WFVqeHRGbGdaQnlyQVJlOG5PQ1A6MTpjaQ';
const CLIENT_SECRET = 'OdKx3LANqE0pEQYYqoaLmT4ecCuI5wvZvOhUrpCCr7tnFHoQPJ';

console.log('🔍 Verifying Twitter OAuth 2.0 Credentials...\n');

// Base64 encode credentials for Basic Auth
const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

// Test OAuth 2.0 token endpoint
const options = {
  hostname: 'api.twitter.com',
  port: 443,
  path: '/2/oauth2/token',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const postData = 'grant_type=client_credentials';

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}\n`);
    
    if (res.statusCode === 200) {
      console.log('✅ OAuth 2.0 credentials are VALID!');
      console.log('✅ Your Twitter app is properly configured for OAuth 2.0\n');
      
      console.log('🤔 The issue might be:');
      console.log('1. The callback URL needs to be EXACTLY: http://localhost:3000/api/auth/callback/twitter');
      console.log('2. Make sure "Website URL" in Twitter app is set to: http://localhost:3000');
      console.log('3. Try clearing cookies and cache');
      console.log('4. Make sure your app has these permissions:');
      console.log('   - Read users profile');
      console.log('   - Read tweets');
      console.log('5. The app must be in "Production" or "Development" mode (not "Suspended")');
    } else {
      console.log('❌ OAuth 2.0 authentication failed!');
      console.log('\nPossible issues:');
      console.log('1. Invalid Client ID or Client Secret');
      console.log('2. OAuth 2.0 not enabled in your Twitter app');
      console.log('3. App might be suspended or in wrong mode');
      console.log('\nGo to: https://developer.twitter.com/en/portal/projects-and-apps');
      console.log('Select your app → "Keys and tokens" → Regenerate if needed');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
});

req.write(postData);
req.end(); 