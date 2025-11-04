/**
 * Test script to verify SES email adapter integration
 *
 * Usage:
 *   node examples/ses-setup/test-ses-email.js
 *
 * Prerequisites:
 *   - SES configured in config.development.json
 *   - Sender email verified in AWS SES
 *   - AWS credentials with SendRawEmail permission
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'development';

const config = require('./ghost/core/core/shared/config');
const adapterManager = require('./ghost/core/core/server/services/adapter-manager');

async function testSESEmail() {
    console.log('🚀 Testing SES Email Adapter...\n');

    try {
        // Load the email adapter (should be SES based on config)
        const emailAdapter = adapterManager.getAdapter('email');
        console.log('✅ SES adapter loaded successfully');

        // Configure test email - REPLACE WITH YOUR TEST EMAIL
        const testEmail = 'recipient@example.com';
        console.log(`📧 Sending test email to ${testEmail}...\n`);

        const emailData = {
            subject: 'Test Email from Ghost SES Adapter',
            html: '<h1>Success!</h1><p>Your Ghost SES adapter is working perfectly! 🎉</p>',
            plaintext: 'Success! Your Ghost SES adapter is working perfectly!',
            from: 'newsletter@yourdomain.com', // Must match verified SES sender
            emailId: 'test-ses-' + Date.now(),
            recipients: [{ email: testEmail }],
            replacementDefinitions: []
        };

        const result = await emailAdapter.send(emailData, {
            openTrackingEnabled: false,
            clickTrackingEnabled: false
        });

        console.log('✅ Email sent successfully!');
        console.log('📬 SES Message ID:', result.id);
        console.log(`\n🎉 Check your inbox at ${testEmail}!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

testSESEmail();
