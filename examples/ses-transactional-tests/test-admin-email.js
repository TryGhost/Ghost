#!/usr/bin/env node

/**
 * Test Script: Admin Test Email via SES
 *
 * This script tests that Ghost can send transactional emails via Amazon SES.
 * It sends a test email using the same mail service that Ghost uses for
 * password resets, invites, and other transactional emails.
 *
 * Prerequisites:
 * - Ghost config.development.json must have mail.transport = "ses" configured
 * - AWS SES credentials must be valid and in the config
 * - From email must be verified in SES (or SES must be out of sandbox)
 *
 * Usage:
 *   node test-admin-email.js your-email@example.com
 */

const path = require('path');

// Load Ghost configuration
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../../ghost/core/core/shared/config'));

// Get mail service
const GhostMailer = require(path.join(__dirname, '../../ghost/core/core/server/services/mail/GhostMailer'));

async function sendTestEmail(toEmail) {
    console.log('🧪 Testing SES Transactional Email');
    console.log('==================================\n');

    // Validate email argument
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Error: Please provide a valid email address');
        console.log('Usage: node test-admin-email.js your-email@example.com');
        process.exit(1);
    }

    // Check SES configuration
    const mailConfig = config.get('mail');
    console.log('📧 Mail Configuration:');
    console.log(`   Transport: ${mailConfig?.transport || 'not configured'}`);
    console.log(`   Region: ${mailConfig?.options?.region || 'not specified'}\n`);

    if (mailConfig?.transport !== 'ses') {
        console.error('❌ Error: SES is not configured as the mail transport');
        console.log('   Please update config.development.json to set mail.transport = "ses"');
        process.exit(1);
    }

    // Create mailer instance
    console.log('🔧 Initializing GhostMailer with SES transport...');
    const mailer = new GhostMailer();

    // Prepare test email message
    const message = {
        to: toEmail,
        subject: 'Test Email from Ghost via Amazon SES',
        html: `
            <h1>🎉 Success!</h1>
            <p>This is a test email sent from Ghost using <strong>Amazon SES</strong> for transactional emails.</p>
            <h2>Email Details:</h2>
            <ul>
                <li><strong>Transport:</strong> ${mailConfig.transport}</li>
                <li><strong>Region:</strong> ${mailConfig.options.region}</li>
                <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
            </ul>
            <p>If you received this email, it means Ghost's transactional email system is working correctly with SES!</p>
            <hr>
            <p style="color: #666; font-size: 0.9em;">
                This is an automated test email from the Ghost SES integration test suite.
            </p>
        `,
        text: `
SUCCESS! This is a test email sent from Ghost using Amazon SES for transactional emails.

Email Details:
- Transport: ${mailConfig.transport}
- Region: ${mailConfig.options.region}
- Sent at: ${new Date().toISOString()}

If you received this email, it means Ghost's transactional email system is working correctly with SES!
        `
    };

    console.log(`📨 Sending test email to: ${toEmail}\n`);

    try {
        // Send the email
        const result = await mailer.send(message);

        console.log('✅ Email sent successfully!');
        console.log('\n📊 SES Response:');
        console.log(`   Message ID: ${result.messageId || 'N/A'}`);
        if (result.response) {
            console.log(`   Response: ${result.response}`);
        }

        console.log('\n✨ Next Steps:');
        console.log('   1. Check your inbox at', toEmail);
        console.log('   2. Verify the email arrived (check spam folder too)');
        console.log('   3. Check AWS CloudWatch for SES metrics');
        console.log('   4. Check SES sending statistics in AWS Console\n');

        return result;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);

        if (error.code === 'MessageRejected') {
            console.log('\n💡 Common fixes:');
            console.log('   - Verify the sender email in SES');
            console.log('   - Move SES out of sandbox mode');
            console.log('   - Check SES sending limits');
        } else if (error.code === 'InvalidParameterValue') {
            console.log('\n💡 Common fixes:');
            console.log('   - Check AWS credentials are correct');
            console.log('   - Verify region is correct');
        }

        console.log('\n🔍 Full error details:');
        console.log(error);
        process.exit(1);
    }
}

// Run the test
const toEmail = process.argv[2];
sendTestEmail(toEmail).then(() => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});
