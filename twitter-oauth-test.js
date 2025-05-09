#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const open = require('open');

// Twitter API credentials from env
const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing Twitter credentials in .env.local');
  process.exit(1);
}

console.log('Twitter OAuth 2.0 Test');
console.log('=====================');
console.log(`Client ID: ${CLIENT_ID.substring(0, 8)}...`);
console.log(`Client Secret: ${CLIENT_SECRET.substring(0, 8)}...`);
console.log(`Redirect URI: ${REDIRECT_URI}`);
console.log('=====================\n');

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
  return crypto.randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Start OAuth flow
const startOAuthFlow = async () => {
  // Generate PKCE values
  const CODE_VERIFIER = generateCodeVerifier();
  const CODE_CHALLENGE = generateCodeChallenge(CODE_VERIFIER);
  const STATE = generateState();
  
  console.log('Generated PKCE code verifier and challenge');
  console.log('Generated state for security');
  
  // Create authorization URL
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', 'tweet.read users.read offline.access');
  authUrl.searchParams.append('state', STATE);
  authUrl.searchParams.append('code_challenge', CODE_CHALLENGE);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  console.log(`\nAuthorization URL: ${authUrl}`);
  
  // Store PKCE values for token exchange
  const pkceValues = { codeVerifier: CODE_VERIFIER, state: STATE };
  
  // Start local server to handle callback
  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;
    
    if (pathname === '/callback') {
      console.log('\nCallback received!');
      
      // Parse query parameters
      const params = Object.fromEntries(requestUrl.searchParams);
      console.log('Query parameters:', params);
      
      // Verify state
      if (params.state !== pkceValues.state) {
        console.error('Error: State mismatch. Potential CSRF attack.');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: State mismatch</h1><p>Authentication failed.</p>');
        server.close();
        process.exit(1);
      }
      
      // Exchange code for token
      if (params.code) {
        console.log(`\nExchanging authorization code for token...`);
        await exchangeCodeForToken(params.code, pkceValues.codeVerifier, res);
        server.close();
      } else {
        console.error('Error: No authorization code received');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code</h1><p>Authentication failed.</p>');
        server.close();
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
    }
  });
  
  // Start server
  server.listen(3333, () => {
    console.log(`\nListener started on http://localhost:3333`);
    console.log('Opening browser for authorization...');
    
    // Open browser for authorization
    open(authUrl.toString());
  });
};

// Exchange authorization code for token
const exchangeCodeForToken = async (code, codeVerifier, res) => {
  // Step 1: First attempt - try with client credentials in authorization header
  await tryExchangeWithHeaderAuth(code, codeVerifier, res);
  
  // Note: If the first attempt fails, we'll try with client credentials in body in the first attempt handler
};

// Try exchanging with authorization header
const tryExchangeWithHeaderAuth = (code, codeVerifier, res) => {
  return new Promise((resolve, reject) => {
    console.log('\nAttempt 1: Using authorization header');
    
    // Create Basic auth credentials
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    // Prepare request body
    const requestData = querystring.stringify({
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    });
    
    // Request options
    const options = {
      hostname: 'api.twitter.com',
      port: 443,
      path: '/2/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(requestData),
        'Authorization': `Basic ${credentials}`
      }
    };
    
    console.log('Request details:');
    console.log('- URL: https://api.twitter.com/2/oauth2/token');
    console.log('- Method: POST');
    console.log('- Headers:');
    console.log('  * Content-Type: application/x-www-form-urlencoded');
    console.log('  * Authorization: Basic ********');
    console.log('- Body parameters:');
    console.log('  * code: (authorization code)');
    console.log('  * grant_type: authorization_code');
    console.log('  * redirect_uri:', REDIRECT_URI);
    console.log('  * code_verifier: (PKCE code verifier)');
    
    // Send token request
    const req = https.request(options, (tokenResponse) => {
      let responseData = '';
      
      tokenResponse.on('data', (chunk) => {
        responseData += chunk;
      });
      
      tokenResponse.on('end', async () => {
        console.log(`\nResponse status: ${tokenResponse.statusCode}`);
        console.log(`Response headers: ${JSON.stringify(tokenResponse.headers, null, 2)}`);
        
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response body:', JSON.stringify(parsedData, null, 2));
          
          if (tokenResponse.statusCode === 200) {
            console.log('\nToken request successful!');
            // Get user info
            await getUserInfo(parsedData.access_token, res);
            resolve();
          } else {
            console.log('\nToken request failed with authorization header. Trying with credentials in body...');
            await tryExchangeWithBodyAuth(code, codeVerifier, res);
            resolve();
          }
        } catch (e) {
          console.error('Error parsing response:', e);
          console.log('Raw response:', responseData);
          await tryExchangeWithBodyAuth(code, codeVerifier, res);
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e);
      tryExchangeWithBodyAuth(code, codeVerifier, res).then(resolve).catch(reject);
    });
    
    req.write(requestData);
    req.end();
  });
};

// Try exchanging with credentials in body
const tryExchangeWithBodyAuth = (code, codeVerifier, res) => {
  return new Promise((resolve, reject) => {
    console.log('\nAttempt 2: Using credentials in request body');
    
    // Prepare request body with client credentials
    const requestData = querystring.stringify({
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    });
    
    // Request options
    const options = {
      hostname: 'api.twitter.com',
      port: 443,
      path: '/2/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    console.log('Request details:');
    console.log('- URL: https://api.twitter.com/2/oauth2/token');
    console.log('- Method: POST');
    console.log('- Headers:');
    console.log('  * Content-Type: application/x-www-form-urlencoded');
    console.log('- Body parameters:');
    console.log('  * code: (authorization code)');
    console.log('  * grant_type: authorization_code');
    console.log('  * client_id: (your client ID)');
    console.log('  * client_secret: (your client secret)');
    console.log('  * redirect_uri:', REDIRECT_URI);
    console.log('  * code_verifier: (PKCE code verifier)');
    
    // Send token request
    const req = https.request(options, (tokenResponse) => {
      let responseData = '';
      
      tokenResponse.on('data', (chunk) => {
        responseData += chunk;
      });
      
      tokenResponse.on('end', async () => {
        console.log(`\nResponse status: ${tokenResponse.statusCode}`);
        console.log(`Response headers: ${JSON.stringify(tokenResponse.headers, null, 2)}`);
        
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response body:', JSON.stringify(parsedData, null, 2));
          
          if (tokenResponse.statusCode === 200) {
            console.log('\nToken request successful!');
            // Get user info
            await getUserInfo(parsedData.access_token, res);
          } else {
            console.log('\nBoth token request attempts failed.');
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication Failed</h1><p>Check the console for details.</p>');
          }
          resolve();
        } catch (e) {
          console.error('Error parsing response:', e);
          console.log('Raw response:', responseData);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Failed</h1><p>Check the console for details.</p>');
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Authentication Failed</h1><p>Check the console for details.</p>');
      resolve();
    });
    
    req.write(requestData);
    req.end();
  });
};

// Get user info using access token
const getUserInfo = async (accessToken, res) => {
  return new Promise((resolve, reject) => {
    console.log('\nFetching user info...');
    
    // Request options
    const options = {
      hostname: 'api.twitter.com',
      port: 443,
      path: '/2/users/me?user.fields=profile_image_url,description,public_metrics',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };
    
    // Send user info request
    const req = https.request(options, (userResponse) => {
      let responseData = '';
      
      userResponse.on('data', (chunk) => {
        responseData += chunk;
      });
      
      userResponse.on('end', () => {
        console.log(`\nUser info response status: ${userResponse.statusCode}`);
        
        try {
          const parsedData = JSON.parse(responseData);
          console.log('User info:', JSON.stringify(parsedData, null, 2));
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Authentication Successful!</h1>
            <h2>User Info:</h2>
            <pre>${JSON.stringify(parsedData, null, 2)}</pre>
          `);
          resolve();
        } catch (e) {
          console.error('Error parsing user info response:', e);
          console.log('Raw response:', responseData);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>User Info Failed</h1><p>Check the console for details.</p>');
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('User info request error:', e);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>User Info Failed</h1><p>Check the console for details.</p>');
      resolve();
    });
    
    req.end();
  });
};

// Start the OAuth flow
startOAuthFlow(); 