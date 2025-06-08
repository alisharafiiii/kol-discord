const fs = require('fs')
const path = require('path')

// New Twitter credentials
const NEW_CREDENTIALS = {
  TWITTER_BEARER_TOKEN: 'AAAAAAAAAAAAAAAAAAAAAHZc0gEAAAAA3Vsj88ytTc3q52m%2FhX9GjP7CUZ0%3DEo3XiFxIw7fBbVw62Zx21WwZ2hD3L5MW89WOP2aSWPH48C4rYj',
  TWITTER_CLIENT_ID: 'UXo4X1ZVakFDTHUyNVNBUXl6Mzc6MTpjaQ',
  TWITTER_CLIENT_SECRET: 'LK1EBtzBcYkXxMR9HAQaFWwzztEAktLiWeyONPTtxDVaxiQF_p'
}

// Email configuration
const EMAIL_CONFIG = {
  SMTP_FROM: 'KOL Platform <notifications@nabulines.com>'
}

// Path to .env.local
const envPath = path.join(__dirname, '..', '.env.local')

// Read existing env file or create new content
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

// Update Twitter credentials
console.log('Updating Twitter credentials...')
for (const [key, value] of Object.entries(NEW_CREDENTIALS)) {
  envContent = updateEnvVar(envContent, key, value)
  console.log(`✓ Updated ${key}`)
}

// Update email configuration
console.log('\nUpdating email configuration...')
for (const [key, value] of Object.entries(EMAIL_CONFIG)) {
  envContent = updateEnvVar(envContent, key, value)
  console.log(`✓ Updated ${key}`)
}

// Write back to file
fs.writeFileSync(envPath, envContent)

console.log('\n✅ Environment variables updated successfully!')
console.log('\nIMPORTANT: Please ensure you also have these SMTP variables configured:')
console.log('- SMTP_HOST (e.g., smtp.gmail.com)')
console.log('- SMTP_PORT (e.g., 587)')
console.log('- SMTP_USER (your email username)')
console.log('- SMTP_PASS (your email password/app-specific password)')
console.log('- SMTP_SECURE (true/false)')

// Verify the configuration
console.log('\nCurrent email configuration in notification service:')
console.log(`- Emails will be sent from: notifications@nabulines.com`)
console.log(`- Using the format: "KOL Platform <notifications@nabulines.com>"`) 