# Amazon SES Transactional Email Setup Guide

## Overview

This guide explains how to configure Ghost to use Amazon SES for transactional emails (password resets, user invitations, magic links, etc.).

**Good News**: Ghost already has built-in support for SES through the `@tryghost/nodemailer` package! This guide is just about configuration, not code changes.

---

## What are Transactional Emails?

Ghost has TWO separate email systems:

### 1. Transactional Emails (This Guide)
- **Purpose**: System-generated emails for user actions
- **Volume**: Low (1-100s per day)
- **Examples**:
  - Password reset emails
  - User invitation emails
  - Magic link sign-in emails
  - Welcome emails
  - Admin test emails
- **Configuration**: `config.mail`

### 2. Bulk Newsletter Emails (Phase 1-2)
- **Purpose**: Member newsletters, announcements
- **Volume**: High (1000s-100000s)
- **Configuration**: `config.adapters.email`

Both can use the same AWS SES credentials!

---

## Prerequisites

Before configuring SES for transactional emails, ensure you have:

1. **AWS Account** with SES enabled
2. **AWS Credentials** (Access Key ID and Secret Access Key)
3. **Verified Email Address** or Domain in SES
4. **SES Out of Sandbox** (optional, for production)

### AWS SES Setup

If you haven't set up SES yet:

1. **Verify Your Domain** (recommended) or Email Address:
   ```
   AWS Console → SES → Verified identities → Create identity
   ```

2. **Create IAM User** with SES permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ses:SendEmail",
           "ses:SendRawEmail"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Request Production Access** (to send to unverified addresses):
   ```
   AWS Console → SES → Account dashboard → Request production access
   ```

---

## Configuration

### Option 1: Explicit Credentials (Development)

Edit `ghost/core/config.development.json`:

```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "us-east-1",
      "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
      "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY"
    }
  }
}
```

**Note**: Never commit real credentials to version control! Use environment variables instead (see Option 3).

### Option 2: IAM Role (Production - Recommended)

If Ghost is running on EC2 or ECS with an IAM role:

```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "us-east-1"
    }
  }
}
```

The AWS SDK will automatically use the instance's IAM role credentials.

### Option 3: Environment Variables (Recommended)

Set environment variables:

```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
```

Then configure Ghost to use them:

```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "process.env.AWS_REGION"
    }
  }
}
```

**Note**: The `process.env` strings are placeholders - Ghost's config system will resolve them.

### Complete Configuration Example

Here's a complete config that uses SES for BOTH transactional and bulk emails:

```json
{
  "enableDeveloperExperiments": true,
  "mail": {
    "transport": "ses",
    "options": {
      "region": "us-west-1",
      "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
      "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY"
    }
  },
  "adapters": {
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-west-1",
        "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
        "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
        "fromEmail": "noreply@yourdomain.com",
        "configurationSet": "ses-analytics"
      }
    }
  }
}
```

---

## Testing

### 1. Restart Ghost

After updating the config, restart Ghost:

```bash
# Kill existing Ghost processes
pkill -9 -f "yarn dev"

# Clear ports
lsof -ti:2368,4200,4201 | xargs kill -9

# Start Ghost
yarn dev
```

### 2. Send Test Email via Ghost Admin

The easiest way to test transactional emails:

1. Open Ghost Admin: `http://localhost:2368/ghost`
2. Go to **Settings** → **Email newsletter** (or similar section)
3. Look for **Send test email** button
4. Enter your email address
5. Click **Send**

Ghost will send a test email using the configured mail transport (SES).

### 3. Test User Invitation (Alternative)

1. Go to **Staff** in Ghost Admin
2. Click **Invite people**
3. Enter an email address
4. Click **Send invitation**

This will send an actual invitation email via SES.

### 4. Check Email Delivery

- Check your inbox (and spam folder!)
- Email should arrive within seconds
- Subject: "Test Ghost Email" or "You've been invited to..."

### 5. Verify in AWS Console

Check SES metrics to confirm delivery:

1. **AWS Console** → **SES** → **Sending statistics**
2. Look for recent sends
3. Check delivery rate (should be 100% for test emails)

**CloudWatch Metrics**:
```
AWS Console → CloudWatch → Metrics → SES
```

Look for:
- Emails sent
- Delivery rate
- Bounce rate
- Complaint rate

---

## Troubleshooting

### Error: "MessageRejected"

**Cause**: Email address or domain not verified in SES

**Solution**:
1. Go to AWS Console → SES → Verified identities
2. Verify the sender email address or domain
3. If using sandbox, verify recipient addresses too
4. Request production access to send to any address

### Error: "Invalid credentials"

**Cause**: AWS credentials are incorrect or expired

**Solution**:
1. Verify access key and secret are correct
2. Check IAM user has SES permissions
3. Ensure credentials haven't expired

### Error: "Configuration error"

**Cause**: Config file syntax error or missing fields

**Solution**:
1. Validate JSON syntax (use JSONLint)
2. Ensure all required fields are present
3. Check quotes and commas

### Email Not Arriving

**Possible causes**:
1. **Sandbox mode**: Only verified addresses can receive emails
2. **Spam folder**: Check recipient's spam
3. **Bounce/Complaint**: Check SES suppression list
4. **Rate limits**: Check SES sending quotas

**Debug steps**:
1. Check Ghost logs: `tail -f /tmp/ghost-dev.log`
2. Check AWS SES sending statistics
3. Check CloudWatch logs for SES
4. Verify recipient email is valid

### Ghost Still Using Old Transport

If Ghost still shows "SMTP" or "Mailgun" after configuring SES:

1. **Restart Ghost completely** (not just refresh browser)
2. **Clear config cache**: Delete `ghost/core/.ghost-cli` if it exists
3. **Check config file location**: Must be in `ghost/core/config.development.json`
4. **Verify JSON syntax**: One missing comma can break config
5. **Check environment**: Ensure `NODE_ENV=development`

---

## Configuration Reference

### Supported mail.transport Values

- `"ses"` - Amazon SES
- `"SMTP"` - Generic SMTP server
- `"mailgun"` - Mailgun API
- `"sendmail"` - Local sendmail
- `"direct"` - Direct SMTP (not recommended)

### SES Configuration Options

| Option | Required | Description | Example |
|--------|----------|-------------|---------|
| `region` | Yes | AWS region | `"us-east-1"` |
| `accessKeyId` | No* | AWS access key | `"AKIA..."` |
| `secretAccessKey` | No* | AWS secret key | `"wJalr..."` |
| `ServiceUrl` | No | Custom SES endpoint | `"https://email.us-east-1.amazonaws.com"` |

*Required unless using IAM role

### Email Template Customization

Ghost's transactional email templates are in:
```
ghost/core/core/server/services/mail/templates/
```

Templates:
- `invite-user.html` - User invitation
- `reset-password.html` - Password reset
- `test.html` - Test email
- `welcome.html` - Welcome email

**Note**: Editing these templates requires code changes and rebuilding Ghost.

---

## Best Practices

### 1. Use Environment Variables

Never commit AWS credentials to version control:

```bash
# .env file (add to .gitignore)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 2. Use IAM Roles in Production

When running on AWS (EC2, ECS, Lambda):
- Attach IAM role to instance
- Ghost will automatically use role credentials
- No need to store credentials in config

### 3. Set Up SES Configuration Sets

Track email analytics with configuration sets:

```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "us-east-1",
      "configurationSet": "transactional-emails"
    }
  }
}
```

Create configuration set in AWS:
```
AWS Console → SES → Configuration sets → Create set
```

### 4. Monitor Bounce and Complaint Rates

Set up SNS notifications for:
- Bounces
- Complaints
- Delivery confirmations

Keep rates low:
- Bounce rate < 5%
- Complaint rate < 0.1%

### 5. Use Verified Domain (Not Email)

Benefits:
- Send from any address `@yourdomain.com`
- Better deliverability
- DKIM signing automatic
- No per-address verification

### 6. Configure SPF, DKIM, DMARC

For best deliverability:

**SPF Record**:
```
v=spf1 include:amazonses.com ~all
```

**DKIM**: Automatically handled by SES (if domain verified)

**DMARC**:
```
_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

---

## Cost Estimate

### AWS SES Pricing (2024)

**EC2-Hosted Apps**:
- First 62,000 emails/month: **FREE**
- After that: **$0.10 per 1,000 emails**

**Non-EC2 Apps**:
- $0.10 per 1,000 emails from start

**Example Costs**:
- 1,000 emails/month: **Free** (EC2) or **$0.10** (other)
- 10,000 emails/month: **Free** (EC2) or **$1.00** (other)
- 100,000 emails/month: **$3.80** (EC2) or **$10.00** (other)

Much cheaper than Mailgun or SendGrid for transactional emails!

---

## Security Considerations

### 1. Least Privilege IAM Policy

Create IAM user with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "arn:aws:ses:us-east-1:123456789012:identity/yourdomain.com"
    }
  ]
}
```

### 2. Rotate Credentials Regularly

- Rotate AWS access keys every 90 days
- Use AWS Secrets Manager for credential storage
- Monitor CloudTrail for SES API calls

### 3. Enable MFA on AWS Account

Protect your AWS account:
- Enable MFA on root account
- Enable MFA on IAM users
- Use AWS Organizations for multi-account setup

### 4. Monitor for Anomalies

Set up CloudWatch alarms for:
- Unusual sending volume
- High bounce rates
- Failed API calls

---

## Next Steps

After configuring SES for transactional emails:

1. **Test All Email Types**
   - Password reset
   - User invitation
   - Magic link sign-in
   - Welcome email

2. **Monitor Delivery**
   - Check SES sending statistics daily
   - Set up CloudWatch alarms
   - Monitor bounce/complaint rates

3. **Move to Production**
   - Request SES production access
   - Set up verified domain (not just email)
   - Configure SPF, DKIM, DMARC
   - Use IAM roles instead of access keys

4. **Optimize Templates**
   - Customize email templates for your brand
   - Test email rendering across clients
   - Add unsubscribe links where appropriate

---

## Additional Resources

- [Ghost Mail Configuration Docs](https://ghost.org/docs/config/#mail)
- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [Nodemailer SES Transport](https://nodemailer.com/transports/ses/)

---

## Summary

Configuring SES for transactional emails is straightforward:

1. **Add config** to `ghost/core/config.development.json`
2. **Restart Ghost**
3. **Test via admin panel**
4. **Verify in AWS console**

That's it! Ghost's built-in SES support through `@tryghost/nodemailer` handles everything else.
