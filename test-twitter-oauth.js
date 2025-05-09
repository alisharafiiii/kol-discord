#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const https = require('https');
const crypto = require('crypto');
const http = require('http');

// Get Twitter OAuth credentials
const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/test-callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing Twitter API credentials in .env.local');
  process.exit(1);
}

console.log('Twitter OAuth 2.0 Test Script');
console.log('============================');
console.log(`Client ID: ${CLIENT_ID.substring(0, 5)}...`);
console.log(`Client Secret: ${CLIENT_SECRET.substring(0, 5)}...`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log('============================\n');

// Generate PKCE code verifier and challenge
const generateCodeVerifier = () => {
  return crypto.randomBytes(32)
    .toString('base64')
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

// Generate state for security
const generateState = () => {
  return crypto.randomBytes(16)
    .toString('hex');
};

// Start the OAuth flow
const startOAuthFlow = async () => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  console.log('Generated PKCE code verifier and challenge');
  console.log('State:', state);
  
  // Build the authorization URL
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', 'users.read tweet.read offline.access');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  console.log(`\nAuthorization URL (copy and paste into your browser):\n${authUrl.toString()}`);
  
  // Start a local server to handle the callback
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = reqUrl.pathname;
    
    if (pathname === '/test-callback') {
      console.log('\nReceived callback!');
      
      // Get the query parameters
      const params = Object.fromEntries(reqUrl.searchParams);
      console.log('Callback parameters:', params);
      
      // Verify state
      if (params.state !== state) {
        console.error('Error: State mismatch');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: State mismatch</h1>');
        server.close();
        return;
      }
      
      // Exchange the code for a token
      if (params.code) {
        console.log('\nExchanging code for token...');
        try {
          const tokenData = await exchangeCodeForToken(params.code, codeVerifier);
          console.log('\nAccess Token received!');
          
          // Get user info
          const userInfo = await getUserInfo(tokenData.access_token);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Authentication Successful</h1>
            <h2>User Info:</h2>
            <pre>${JSON.stringify(userInfo, null, 2)}</pre>
          `);
        } catch (error) {
          console.error('Error:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error</h1><p>${error.message}</p>`);
        }
      } else {
        console.error('Error: No code parameter');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No code parameter</h1>');
      }
      
      server.close();
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
    }
  });
  
  // Start server and open browser
  server.listen(3333, () => {
    console.log('Server listening on port 3333');
    console.log('Please open the authorization URL in your browser');
  });
};

// Exchange authorization code for token
const exchangeCodeForToken = (code, codeVerifier) => {
  return new Promise((resolve, reject) => {
    // Create Basic auth header
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    // Prepare token request body
    const body = new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    }).toString();
    
    const options = {
      hostname: 'api.twitter.com',
      port: 443,
      path: '/2/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Basic ${credentials}`
      }
    };
    
    console.log('Making token request with:');
    console.log('- URL: https://api.twitter.com/2/oauth2/token');
    console.log('- Method: POST');
    console.log('- Headers:');
    console.log('  * Content-Type: application/x-www-form-urlencoded');
    console.log('  * Authorization: Basic [CREDENTIALS HIDDEN]');
    console.log('- Body:');
    console.log('  * code: [CODE HIDDEN]');
    console.log('  * code_verifier: [VERIFIER HIDDEN]');
    console.log('  * grant_type: authorization_code');
    console.log('  * redirect_uri:', REDIRECT_URI);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\nToken response status: ${res.statusCode}`);
        
        try {
          const parsedData = JSON.parse(data);
          console.log('Token response:', JSON.stringify(parsedData, null, 2));
          
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          console.log('Raw response:', data);
          reject(new Error('Failed to parse response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.write(body);
    req.end();
  });
};

// Get user info with access token
const getUserInfo = (accessToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.twitter.com',
      port: 443,
      path: '/2/users/me?user.fields=profile_image_url,description,public_metrics,location',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\nUser info response status: ${res.statusCode}`);
        
        try {
          const parsedData = JSON.parse(data);
          console.log('User info:', JSON.stringify(parsedData, null, 2));
          
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(new Error('Failed to parse response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.end();
  });
};

// Run the OAuth flow
startOAuthFlow(); 