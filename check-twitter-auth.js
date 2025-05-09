#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// Get credentials from environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
  console.error('Error: TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not found in .env.local');
  process.exit(1);
}

console.log('Twitter credentials found in .env.local');
console.log(`Client ID: ${TWITTER_CLIENT_ID.substring(0, 5)}...`);
console.log(`Client Secret: ${TWITTER_CLIENT_SECRET.substring(0, 5)}...`);

// Generate PKCE Code Verifier and Challenge
const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const generateCodeChallenge = (verifier) => {
  return crypto.createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Test client credentials grant to check if API keys are working
const testClientCredentialsGrant = () => {
  console.log('\nTesting Twitter API credentials...');
  
  const CODE_VERIFIER = generateCodeVerifier();
  const CODE_CHALLENGE = generateCodeChallenge(CODE_VERIFIER);
  
  console.log('Generated PKCE code verifier');
  
  // Basic authentication with client_id and client_secret
  const credentials = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
  
  // Request parameters
  const data = querystring.stringify({
    grant_type: 'client_credentials',
    code_verifier: CODE_VERIFIER,
    code_challenge: CODE_CHALLENGE,
    code_challenge_method: 'S256'
  });
  
  // Request options
  const options = {
    hostname: 'api.twitter.com',
    port: 443,
    path: '/2/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
      'Authorization': `Basic ${credentials}`
    }
  };
  
  console.log('Sending request to Twitter OAuth 2.0 token endpoint...');
  
  // Make request to Twitter API
  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log(`\nResponse status: ${res.statusCode}`);
      console.log(`Response headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      try {
        const parsedData = JSON.parse(responseData);
        if (res.statusCode === 200) {
          console.log('\nTwitter API credentials are valid!');
          console.log('Response contains token: ', !!parsedData.access_token);
        } else {
          console.log('\nTwitter API credentials test failed.');
          console.log('Error response:', JSON.stringify(parsedData, null, 2));
          
          if (parsedData.error === 'invalid_client') {
            console.log('\nTROUBLESHOOTING:');
            console.log('1. Double check your Client ID and Client Secret');
            console.log('2. Make sure your Twitter Developer App has OAuth 2.0 enabled');
            console.log('3. Check callback URL in Twitter Developer Portal matches your NextAuth callback URL');
          }
        }
      } catch (e) {
        console.log('Error parsing response:', e);
        console.log('Raw response:', responseData);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('Request error:', e);
  });
  
  req.write(data);
  req.end();
};

testClientCredentialsGrant(); 