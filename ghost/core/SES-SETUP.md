# Amazon SES Email Provider Setup

This guide explains how to configure Ghost to use Amazon SES for email delivery.

## Prerequisites

1. **AWS Account** with SES enabled
2. **Verified email domain** in Amazon SES
3. **SES moved out of sandbox mode** (for production use)
4. **AWS IAM user** with SES permissions

## Required AWS Infrastructure

### 1. SES Configuration
- Verify your sending domain in SES
- Move out of SES sandbox (production only)
- Create a Configuration Set (e.g., `ses-analytics`)

### 2. SNS Topic (for email analytics)
- Create an SNS topic (e.g., `ses-events`)
- Subscribe the SQS queue to this topic

### 3. SQS Queue (for email analytics)
- Create an SQS queue (e.g., `ses-events-queue`)
- Configure the queue to receive messages from SNS

### 4. IAM Permissions
Your IAM user needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendRawEmail",
        "ses:SendEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:REGION:ACCOUNT_ID:ses-events-queue"
    }
  ]
}
```

## Ghost Configuration

### Development Setup

1. Copy the example config:
   ```bash
   cp config.development.json.example config.development.json
   ```

2. Update `config.development.json` with your AWS credentials:
   ```json
   {
     "enableDeveloperExperiments": true,
     "mail": {
       "transport": "ses",
       "from": "noreply@yourdomain.com",
       "options": {
         "region": "us-east-1",
         "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
         "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY"
       }
     },
     "adapters": {
       "email": {
         "active": "ses",
         "ses": {
           "region": "us-east-1",
           "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
           "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
           "fromEmail": "noreply@yourdomain.com",
           "configurationSet": "ses-analytics"
         }
       }
     },
     "emailAnalytics": {
       "ses": {
         "queueUrl": "https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/ses-events-queue",
         "region": "us-east-1",
         "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
         "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY"
       }
     }
   }
   ```

### Production Setup

1. Copy the example config:
   ```bash
   cp config.production.json.example config.production.json
   ```

2. Update with your production settings (see `config.production.json.example`)

3. **Security Best Practice**: Use environment variables or AWS IAM roles instead of hardcoding credentials:
   ```json
   {
     "adapters": {
       "email": {
         "active": "ses",
         "ses": {
           "region": "us-east-1",
           "fromEmail": "noreply@yourdomain.com",
           "configurationSet": "ses-analytics"
         }
       }
     }
   }
   ```
   Then configure AWS credentials via:
   - EC2 IAM role (recommended)
   - Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
   - AWS credentials file (`~/.aws/credentials`)

## Configuration Sections Explained

### 1. `mail` - Transactional Emails
Used for password resets, invitations, and magic links.
- **Required fields**: `transport`, `from`, `options.region`
- **Optional**: `options.accessKeyId`, `options.secretAccessKey` (if using IAM roles)

### 2. `adapters.email` - Newsletter/Bulk Emails
Used for member newsletters and bulk email campaigns.
- **Required fields**: `active`, `ses.region`, `ses.fromEmail`
- **Optional**: `ses.configurationSet` (for analytics), credentials

### 3. `emailAnalytics` - Email Event Tracking
Tracks opens, clicks, bounces, and complaints.
- **Required fields**: `ses.queueUrl`, `ses.region`
- **Optional**: credentials

## Verification

After configuring, check that Ghost initializes SES correctly:

```bash
yarn dev
```

You should see these log messages on startup:
```
[INFO] Using Amazon SES email provider
[INFO] [EmailAnalytics] Using Amazon SES analytics provider
```

## Testing

### Test Transactional Email
1. Go to Ghost Admin → Settings → Labs
2. Send a test email

### Test Newsletter
1. Create a post in Ghost Admin
2. Click "Publish" → "Send newsletter"
3. Send to yourself or test members

## Troubleshooting

### "Set up an email provider" message in admin
**Problem**: Config file is incomplete or missing.

**Solution**: Ensure all three config sections (`mail`, `adapters.email`, `emailAnalytics`) are present in your `config.development.json` or `config.production.json` file.

### "Invalid tag value" error
**Problem**: Email addresses with `+` characters (e.g., `user+test@example.com`).

**Solution**: This is fixed in the latest version. SES tags automatically sanitize email addresses.

### No analytics data
**Problem**: SQS queue not receiving events, or wrong queue URL.

**Solution**:
1. Verify the SNS → SQS subscription is confirmed
2. Check that SES Configuration Set publishes events to SNS
3. Verify the queue URL is correct

## Security Notes

- **Never commit** `config.development.json` or `config.production.json` to git
- Use IAM roles on EC2/ECS instead of access keys when possible
- Rotate AWS credentials regularly
- Use separate IAM users for development and production
- Enable AWS CloudTrail for audit logging

## Additional Resources

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Ghost Email Configuration](https://ghost.org/docs/config/#mail)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
