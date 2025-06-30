import nodemailer from 'nodemailer'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
const envPath = join(__dirname, '..', '..', '.env.local')
config({ path: envPath })

// Email system enabled flag
let emailEnabled = true

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'notifications@nabulines.com',
    pass: process.env.SMTP_PASS || 'NabuL1n3s2024!'
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Verify SMTP connection
export async function verifyEmailConnection() {
  try {
    await transporter.verify()
    console.log('✅ Email notification system ready')
    emailEnabled = true
    return true
  } catch (error) {
    console.error('⚠️  Email system not configured:', error.message)
    console.log('📝 Note: The bot will continue to work without email notifications.')
    console.log('   To enable email alerts, configure SMTP settings in .env.local:')
    console.log('   SMTP_HOST=your-smtp-host')
    console.log('   SMTP_PORT=587')
    console.log('   SMTP_USER=your-email@example.com')
    console.log('   SMTP_PASS=your-password')
    console.log('   ADMIN_EMAIL=admin@example.com')
    emailEnabled = false
    return false
  }
}

// Send bot alert email
export async function sendBotAlert(botName, error, additionalInfo = {}) {
  if (!emailEnabled) {
    console.log('📧 Email notifications disabled - skipping alert')
    return false
  }
  
  try {
    const timestamp = new Date().toISOString()
    const subject = `ALERT: ${botName} Stopped`
    
    const htmlBody = `
      <h2>Discord Analytics Bot Alert</h2>
      <p><strong>Bot:</strong> ${botName}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>Status:</strong> STOPPED</p>
      
      ${error ? `
      <h3>Error Details:</h3>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
${error.message || error}
${error.stack || ''}
      </pre>
      ` : '<p>Bot stopped without error details</p>'}
      
      ${additionalInfo.lastActivity ? `
      <p><strong>Last Activity:</strong> ${additionalInfo.lastActivity}</p>
      ` : ''}
      
      ${additionalInfo.processInfo ? `
      <h3>Process Information:</h3>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
${JSON.stringify(additionalInfo.processInfo, null, 2)}
      </pre>
      ` : ''}
      
      <h3>Recovery Instructions:</h3>
      <ol>
        <li>SSH into the server</li>
        <li>Navigate to the project directory: <code>cd /path/to/kol</code></li>
        <li>Check PM2 status: <code>pm2 status</code></li>
        <li>If bot is not in PM2 list: <code>pm2 start discord-bots/ecosystem.config.js --only discord-analytics</code></li>
        <li>If bot is in error state: <code>pm2 restart discord-analytics</code></li>
        <li>Check logs: <code>pm2 logs discord-analytics --lines 50</code></li>
      </ol>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        This is an automated alert from the Discord Analytics Bot monitoring system.
      </p>
    `
    
    const textBody = `
Discord Analytics Bot Alert

Bot: ${botName}
Timestamp: ${timestamp}
Status: STOPPED

${error ? `Error Details:\n${error.message || error}\n${error.stack || ''}` : 'Bot stopped without error details'}

${additionalInfo.lastActivity ? `Last Activity: ${additionalInfo.lastActivity}` : ''}

Recovery Instructions:
1. SSH into the server
2. Navigate to project: cd /path/to/kol
3. Check PM2 status: pm2 status
4. If bot not in list: pm2 start discord-bots/ecosystem.config.js --only discord-analytics
5. If bot in error state: pm2 restart discord-analytics
6. Check logs: pm2 logs discord-analytics --lines 50

This is an automated alert from the Discord Analytics Bot monitoring system.
    `
    
    const mailOptions = {
      from: `"Nabulines Bot Monitor" <${process.env.SMTP_USER || 'notifications@nabulines.com'}>`,
      to: process.env.ADMIN_EMAIL || 'admin@nabulines.com',
      subject: subject,
      text: textBody,
      html: htmlBody
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('📧 Alert email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('⚠️  Failed to send alert email:', error.message)
    return false
  }
}

// Send test email
export async function sendTestEmail() {
  if (!emailEnabled) {
    console.log('📧 Email notifications disabled - skipping test')
    return false
  }
  
  try {
    const mailOptions = {
      from: `"Nabulines Bot Monitor" <${process.env.SMTP_USER || 'notifications@nabulines.com'}>`,
      to: process.env.ADMIN_EMAIL || 'admin@nabulines.com',
      subject: 'TEST: Discord Bot Email Notifications Working',
      text: 'This is a test email to confirm the notification system is working correctly.',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to confirm the Discord bot notification system is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p style="color: #666; font-size: 12px;">If you received this, the email notification system is properly configured.</p>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('📧 Test email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('⚠️  Failed to send test email:', error.message)
    return false
  }
} 