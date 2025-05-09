#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for Twitter credentials
rl.question('Enter your Twitter Client ID: ', (clientId) => {
  rl.question('Enter your Twitter Client Secret: ', (clientSecret) => {
    // Generate random secret
    const nextAuthSecret = crypto.randomBytes(32).toString('base64');
    
    // Create .env.local content
    const envContent = `TWITTER_CLIENT_ID=${clientId.trim()}
TWITTER_CLIENT_SECRET=${clientSecret.trim()}
NEXTAUTH_SECRET=${nextAuthSecret}
NEXTAUTH_URL=http://localhost:3000
`;

    // Write to .env.local
    fs.writeFileSync('.env.local', envContent);
    console.log('\n.env.local has been updated with new credentials.');
    console.log('Make sure to update your environment variables in Vercel too!\n');
    
    rl.close();
  });
});
