const fs = require('fs')
const path = require('path')

// Get command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log('❌ Usage: node set-smtp-credentials.js <email> <password>')
  console.log('Example: node set-smtp-credentials.js notifications@nabulines.com YourPassword123')
  process.exit(1)
}

const [email, password] = args

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

console.log('🔐 Setting SMTP Credentials\n')

// Update SMTP credentials
envContent = updateEnvVar(envContent, 'SMTP_USER', email)
envContent = updateEnvVar(envContent, 'SMTP_PASS', password)

// Write back to file
fs.writeFileSync(envPath, envContent)

console.log(`✅ SMTP_USER: ${email}`)
console.log(`✅ SMTP_PASS: ***${password.slice(-4)}`)

console.log('\n🎉 SMTP configuration complete!')
console.log('\n📧 Email Configuration Summary:')
console.log('─'.repeat(50))
console.log(`From: notifications@nabulines.com`)
console.log(`SMTP Host: mail.privateemail.com`)
console.log(`SMTP Port: 587 (TLS)`)
console.log(`SMTP User: ${email}`)
console.log(`SMTP Pass: ***${password.slice(-4)}`)

console.log('\n✅ The notification service is now ready to send emails!')
console.log('\n💡 To test email sending, you can:')
console.log('1. Add a note to a profile')
console.log('2. Update payment status for a KOL')
console.log('3. Assign a KOL to a campaign') 