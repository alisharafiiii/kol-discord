#!/usr/bin/env node

import { sendTestEmail, sendBotAlert, verifyEmailConnection } from './lib/email-notifier.mjs'

console.log('🧪 Testing Discord Bot Email Notification System\n')

async function runTests() {
  try {
    // Test 1: Verify email connection
    console.log('1️⃣ Testing email connection...')
    const connectionOk = await verifyEmailConnection()
    if (!connectionOk) {
      console.error('❌ Email connection failed!')
      return
    }
    console.log('✅ Email connection verified\n')
    
    // Test 2: Send test email
    console.log('2️⃣ Sending test email...')
    const testEmailSent = await sendTestEmail()
    if (!testEmailSent) {
      console.error('❌ Failed to send test email!')
      return
    }
    console.log('✅ Test email sent successfully\n')
    
    // Test 3: Send bot alert email
    console.log('3️⃣ Sending bot alert email...')
    const testError = new Error('Test error - Bot stopped for testing purposes')
    testError.stack = 'Error: Test error - Bot stopped for testing purposes\n    at runTests (test-email-notification.mjs:25:21)'
    
    const alertSent = await sendBotAlert('Discord Analytics Bot (TEST)', testError, {
      lastActivity: new Date().toISOString(),
      totalMessagesProcessed: 1234,
      errorCount: 5,
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    })
    
    if (!alertSent) {
      console.error('❌ Failed to send bot alert email!')
      return
    }
    console.log('✅ Bot alert email sent successfully\n')
    
    console.log('🎉 All email notification tests passed!')
    console.log('\n📧 Check the admin email inbox for:')
    console.log('   1. Test email with subject: "TEST: Discord Bot Email Notifications Working"')
    console.log('   2. Alert email with subject: "ALERT: Discord Analytics Bot (TEST) Stopped"')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the tests
runTests() 