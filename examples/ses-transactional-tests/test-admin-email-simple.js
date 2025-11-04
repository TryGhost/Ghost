#!/usr/bin/env node

/**
 * Simplified Test Script: Send Test Email
 *
 * This script tests sending a transactional email using Ghost's mail service.
 * It will use whatever mail transport Ghost has configured (SMTP, SES, etc.).
 *
 * Usage:
 *   node test-admin-email-simple.js your-email@example.com
 */

const path = require('path');

async function sendTestEmail(toEmail) {
    console.log('🧪 Testing Ghost Transactional Email');
    console.log('====================================\n');

    // Validate email argument
    if (!toEmail || !toEmail.includes('@')) {
        console.error('❌ Error: Please provide a valid email address');
        console.log('Usage: node test-admin-email-simple.js your-email@example.com');
        process.exit(1);
    }

    // Get mail service
    const GhostMailer = require(path.join(__dirname, '../../ghost/core/core/server/services/mail/GhostMailer'));

    // Create mailer instance
    console.log('🔧 Initializing GhostMailer...');
    const mailer = new GhostMailer();

    // Check what transport is being used
    const transportInfo = mailer.transport?.transporter?.name || 'unknown';
    console.log(`📧 Using transport: ${transportInfo}\n`);

    // Prepare test email message
    const message = {
        to: toEmail,
        subject: 'Test Email from Ghost - Phase 3 SES Integration',
        html: `
            <h1>🎉 Success!</h1>
            <p>This is a test email sent from Ghost's transactional email system.</p>
            <p>If you're seeing this, it means Ghost can send transactional emails!</p>
            <h2>Test Details:</h2>
            <ul>
                <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
                <li><strong>Transport:</strong> ${transportInfo}</li>
                <li><strong>Test:</strong> Phase 3 - SES Transactional Email Integration</li>
            </ul>
            <hr>
            <p style="color: #666; font-size: 0.9em;">
                This is an automated test email from the Ghost SES integration test suite.
            </p>
        `,
        text: `
SUCCESS! This is a test email sent from Ghost's transactional email system.

Test Details:
- Sent at: ${new Date().toISOString()}
- Transport: ${transportInfo}
- Test: Phase 3 - SES Transactional Email Integration

If you're seeing this, it means Ghost can send transactional emails!
        `
    };

    console.log(`📨 Sending test email to: ${toEmail}\n`);

    try {
        // Send the email
        const result = await mailer.send(message);

        console.log('✅ Email sent successfully!');
        console.log('\n📊 Response:');
        console.log(`   Message ID: ${result.messageId || 'N/A'}`);
        console.log(`   Response: ${result.response || 'N/A'}`);

        console.log('\n✨ Next Steps:');
        console.log('   1. Check your inbox at', toEmail);
        console.log('   2. Verify the email arrived (check spam folder too)');
        console.log('   3. If using SES, check AWS CloudWatch for metrics');
        console.log('   4. If using SES, check SES sending statistics in AWS Console\n');

        return result;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);

        console.log('\n💡 Possible issues:');
        console.log('   - Mail transport not configured');
        console.log('   - Invalid credentials');
        console.log('   - Email address not verified (if using SES sandbox)');
        console.log('   - Network connectivity issues');

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
