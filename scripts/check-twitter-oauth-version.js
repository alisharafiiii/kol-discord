console.log('🔍 Twitter OAuth Configuration Check\n');

const CLIENT_ID = 'WFVqeHRGbGdaQnlyQVJlOG5PQ1A6MTpjaQ';
const CLIENT_SECRET = 'OdKx3LANqE0pEQYYqoaLmT4ecCuI5wvZvOhUrpCCr7tnFHoQPJ';

console.log('📋 Your Current Credentials:');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Client Secret: ${CLIENT_SECRET.substring(0, 20)}...`);
console.log('');

console.log('🔍 Analyzing your Client ID format...');
// OAuth 2.0 Client IDs typically have format: XXXXXXXXXXXXXXXXXXXXXXXXX:X:XX
// OAuth 1.0a API Keys are typically 25 characters long

const idParts = CLIENT_ID.split(':');
if (idParts.length === 3) {
  console.log('✅ Client ID format matches OAuth 2.0 pattern');
} else {
  console.log('⚠️  Client ID format might be OAuth 1.0a');
}

console.log('\n📌 Important Twitter App Settings to Check:\n');

console.log('1. Go to: https://developer.twitter.com/en/portal/projects-and-apps');
console.log('2. Select your app');
console.log('3. Click "User authentication settings"');
console.log('4. Make sure you see "OAuth 2.0" toggle is ON');
console.log('5. Under OAuth 2.0, verify:');
console.log('   - Type of App: Web App');
console.log('   - Callback URI: http://localhost:3000/api/auth/callback/twitter');
console.log('   - Website URL: http://localhost:3000');
console.log('');
console.log('6. Also check "App permissions":');
console.log('   - Should have "Read" access');
console.log('');

console.log('🔧 Common Fix:');
console.log('If OAuth 2.0 is OFF:');
console.log('1. Turn it ON');
console.log('2. You might get NEW Client ID and Secret');
console.log('3. Update your .env.local with the new credentials');
console.log('');

console.log('💡 Quick Test:');
console.log('Your callback URL should be added EXACTLY as:');
console.log('http://localhost:3000/api/auth/callback/twitter');
console.log('(no trailing slash, exact case)'); 