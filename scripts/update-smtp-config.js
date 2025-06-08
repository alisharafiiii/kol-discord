const fs = require('fs')
const path = require('path')

// Namecheap Private Email SMTP Configuration
const SMTP_CONFIG = {
  SMTP_HOST: 'mail.privateemail.com',
  SMTP_PORT: '587', // Use 587 for TLS or 465 for SSL
  SMTP_SECURE: 'false', // false for port 587 (TLS), true for port 465 (SSL)
}

// Path to .env.local
const envPath = path.join(__dirname, '..', '.env.local')

// Read existing env file
let envContent = ''
try {
  envContent = fs.readFileSync(envPath, 'utf8')
} catch (error) {
  console.log('.env.local not found, creating new file...')
}

// Function to update or add environment variable
function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'gm')
  if (regex.test(content)) {
    // Update existing
    return content.replace(regex, `${key}=${value}`)
  } else {
    // Add new
    return content + (content.endsWith('\n') || content === '' ? '' : '\n') + `${key}=${value}\n`
  }
}

console.log('🔧 Updating SMTP Configuration for Namecheap Private Email\n')

// Update SMTP settings
for (const [key, value] of Object.entries(SMTP_CONFIG)) {
  envContent = updateEnvVar(envContent, key, value)
  console.log(`✓ Updated ${key}: ${value}`)
}

// Write back to file
fs.writeFileSync(envPath, envContent)

console.log('\n✅ SMTP configuration updated!')
console.log('\n📝 You still need to provide:')
console.log('─'.repeat(50))
console.log('1. SMTP_USER: Your full email address (e.g., notifications@nabulines.com)')
console.log('2. SMTP_PASS: Your email password')
console.log('\n💡 To complete the setup, run:')
console.log('   node scripts/set-smtp-credentials.js <email> <password>')
console.log('\nExample:')
console.log('   node scripts/set-smtp-credentials.js notifications@nabulines.com YourPassword123') 