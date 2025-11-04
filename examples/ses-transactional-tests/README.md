# SES Transactional Email Test Scripts

This folder contains test scripts for verifying Amazon SES configuration for Ghost transactional emails.

## Overview

Ghost uses transactional emails for:
- Password resets
- User invitations
- Magic link sign-in
- Welcome emails
- Admin test emails

These scripts help verify that SES is correctly configured for these email types.

---

## Prerequisites

1. **Ghost configured with SES** for transactional emails:
   ```json
   {
     "mail": {
       "transport": "ses",
       "options": {
         "region": "us-east-1",
         "accessKeyId": "YOUR_KEY",
         "secretAccessKey": "YOUR_SECRET"
       }
     }
   }
   ```

2. **AWS SES setup**:
   - Verified email address or domain
   - Valid AWS credentials
   - SES out of sandbox (for production)

3. **Ghost running**: `yarn dev`

---

## Test Scripts

### test-admin-email.js

**Purpose**: Send a test email using Ghost's mail service

**Usage**:
```bash
node test-admin-email.js your-email@example.com
```

**What it tests**:
- SES configuration is loaded correctly
- Ghost mail service can initialize
- Email can be sent via SES

**Expected output**:
```
🧪 Testing SES Transactional Email
==================================

📧 Mail Configuration:
   Transport: ses
   Region: us-east-1

🔧 Initializing GhostMailer with SES transport...
📨 Sending test email to: your-email@example.com

✅ Email sent successfully!

📊 SES Response:
   Message ID: 01000191e8e3d4f5-abc123...
```

**Common issues**:
- "SES is not configured" → Check config.development.json
- "MessageRejected" → Email/domain not verified in SES
- "Invalid credentials" → AWS keys incorrect

### test-admin-email-simple.js

**Purpose**: Simplified test that doesn't check config first

**Usage**:
```bash
node test-admin-email-simple.js your-email@example.com
```

**What it tests**:
- Email sending functionality
- Works with any mail transport

**Note**: This script doesn't validate the config first, so it will attempt to send regardless of transport type.

---

## Manual Testing (Recommended)

The easiest way to test transactional emails is through the Ghost admin panel:

### Method 1: Test Email Feature

1. Open Ghost Admin: `http://localhost:2368/ghost`
2. Go to **Settings** → **Email newsletter**
3. Find **Send test email** button
4. Enter your email address
5. Click **Send**

This will send a test email using whatever mail transport is configured.

### Method 2: User Invitation

1. Go to **Staff** in Ghost Admin
2. Click **Invite people**
3. Enter an email address
4. Click **Send invitation**

This sends an actual invitation email and tests the complete flow.

### Method 3: Password Reset

1. Log out of Ghost Admin
2. Click **Forgot password**
3. Enter your email address
4. Check your inbox for reset email

---

## Verification

### Check Email Delivery

1. **Inbox**: Check the email arrived
2. **Spam folder**: Sometimes emails go to spam initially
3. **Email content**: Verify it renders correctly

### Check AWS SES Console

1. **Sending Statistics**:
   ```
   AWS Console → SES → Sending statistics
   ```
   Look for:
   - Number of emails sent
   - Delivery rate (should be 100%)
   - Bounce rate (should be 0%)

2. **CloudWatch Metrics**:
   ```
   AWS Console → CloudWatch → Metrics → SES
   ```
   Metrics to check:
   - `Send`
   - `Delivery`
   - `Bounce`
   - `Complaint`

3. **Configuration Set Analytics** (if enabled):
   ```
   AWS Console → SES → Configuration sets → [your-set] → Analytics
   ```

### Check Ghost Logs

Watch Ghost logs while sending:

```bash
tail -f /tmp/ghost-dev.log
```

Look for:
- Email sending initiated
- SES response
- Any errors

---

## Troubleshooting

### Script Errors

**Error**: `Cannot read properties of undefined (reading 'defaultFromEmail')`

**Cause**: GhostMailer needs full Ghost context (settings, config, etc.)

**Solution**: Use manual testing via admin panel instead

**Error**: `SES is not configured as the mail transport`

**Cause**: Config not loaded or using wrong file

**Solution**:
1. Verify config is in `ghost/core/config.development.json`
2. Restart Ghost completely
3. Check NODE_ENV is set to 'development'

### Email Not Sending

**Issue**: No email arrives

**Debug steps**:
1. Check Ghost logs for errors
2. Verify SES credentials are correct
3. Check email address is verified in SES (sandbox mode)
4. Check AWS SES sending statistics
5. Check SES sending quotas not exceeded

**Issue**: Email goes to spam

**Solutions**:
- Verify domain (not just email) in SES
- Set up SPF, DKIM, DMARC records
- Use verified "from" address
- Check content doesn't trigger spam filters

### AWS SES Errors

**Error**: `MessageRejected: Email address is not verified`

**Solution**:
- Go to AWS SES console
- Verify the sender email or domain
- If in sandbox, verify recipient emails too

**Error**: `Daily sending quota exceeded`

**Solution**:
- Check SES sending limits in AWS console
- Request limit increase if needed
- Move out of sandbox mode

**Error**: `InvalidParameterValue`

**Solution**:
- Check AWS region is correct
- Verify credentials format
- Check SES is enabled in that region

---

## Test Email Types

Ghost sends these transactional email types:

| Email Type | Trigger | Template |
|------------|---------|----------|
| **Password Reset** | User clicks "Forgot password" | `reset-password.html` |
| **User Invitation** | Admin invites new user | `invite-user.html` |
| **Magic Link** | Member signs in without password | Generated in code |
| **Welcome Email** | New member signup | `welcome.html` |
| **Test Email** | Admin tests email config | `test.html` |

To thoroughly test SES, you should test at least:
1. Password reset email
2. User invitation email
3. Admin test email

---

## Next Steps

After successfully testing:

1. **Move to production**:
   - Request SES production access
   - Use verified domain (not just email)
   - Set up proper DNS records (SPF, DKIM, DMARC)

2. **Monitor delivery**:
   - Set up CloudWatch alarms
   - Monitor bounce/complaint rates
   - Track sending quotas

3. **Customize templates**:
   - Edit templates in `ghost/core/core/server/services/mail/templates/`
   - Add your branding
   - Test across email clients

---

## Additional Resources

- [SES Transactional Setup Guide](../../ai/phase-3-transactional/SES-TRANSACTIONAL-SETUP.md)
- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [Ghost Mail Configuration](https://ghost.org/docs/config/#mail)

---

## Summary

**Recommended Testing Approach**:
1. Use Ghost Admin panel to send test email (easiest)
2. Test user invitation flow
3. Verify in AWS SES console
4. Monitor CloudWatch metrics

**Note**: The Node.js test scripts are provided for reference but manual testing via the admin panel is more reliable and tests the complete Ghost integration.
