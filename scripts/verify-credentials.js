const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

console.log('🔍 Verifying Environment Configuration\n')

// Check Twitter Credentials
console.log('📱 Twitter Credentials:')
console.log('─'.repeat(50))

const twitterCreds = {
  'Client ID': process.env.TWITTER_CLIENT_ID,
  'Client Secret': process.env.TWITTER_CLIENT_SECRET ? '***' + process.env.TWITTER_CLIENT_SECRET.slice(-4) : undefined,
  'Bearer Token': process.env.TWITTER_BEARER_TOKEN ? '***' + process.env.TWITTER_BEARER_TOKEN.slice(-10) : undefined
}

for (const [key, value] of Object.entries(twitterCreds)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`)
  } else {
    console.log(`❌ ${key}: NOT SET`)
  }
}

// Check Email Configuration
console.log('\n📧 Email Configuration:')
console.log('─'.repeat(50))

const emailConfig = {
  'SMTP From': process.env.SMTP_FROM,
  'SMTP Host': process.env.SMTP_HOST,
  'SMTP Port': process.env.SMTP_PORT,
  'SMTP User': process.env.SMTP_USER,
  'SMTP Pass': process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : undefined,
  'SMTP Secure': process.env.SMTP_SECURE
}

for (const [key, value] of Object.entries(emailConfig)) {
  if (value !== undefined && value !== '') {
    console.log(`✅ ${key}: ${key.includes('Pass') ? value : value}`)
  } else {
    console.log(`⚠️  ${key}: NOT SET`)
  }
}

// Check other important variables
console.log('\n🔐 Other Important Variables:')
console.log('─'.repeat(50))

const otherVars = {
  'NextAuth URL': process.env.NEXTAUTH_URL,
  'NextAuth Secret': process.env.NEXTAUTH_SECRET ? '***configured***' : undefined,
  'Redis URL': process.env.REDIS_URL ? '***configured***' : undefined
}

for (const [key, value] of Object.entries(otherVars)) {
  if (value) {
    console.log(`✅ ${key}: ${value}`)
  } else {
    console.log(`❌ ${key}: NOT SET`)
  }
}

// Summary
console.log('\n📊 Summary:')
console.log('─'.repeat(50))

const allConfigured = 
  twitterCreds['Client ID'] && 
  twitterCreds['Client Secret'] && 
  twitterCreds['Bearer Token'] &&
  emailConfig['SMTP From']

if (allConfigured) {
  console.log('✅ Twitter credentials and email sender are properly configured!')
  console.log('✅ Emails will be sent from: notifications@nabulines.com')
} else {
  console.log('❌ Some required credentials are missing!')
}

if (!emailConfig['SMTP User'] || !emailConfig['SMTP Pass']) {
  console.log('\n⚠️  Note: SMTP authentication credentials are not set.')
  console.log('   The notification service will run in simulation mode.')
  console.log('   To enable actual email sending, configure SMTP_USER and SMTP_PASS.')
} 