# Amazon SES Email Provider Setup

This guide explains how to configure Ghost to use Amazon SES for email delivery.

## Prerequisites

1. **AWS Account** with SES enabled
2. **Verified email domain** in Amazon SES
3. **SES moved out of sandbox mode** (for production use)
4. **AWS IAM user** with SES permissions

## Required AWS Infrastructure

### Overview

Ghost's SES integration requires four AWS services working together:

1. **Amazon SES** - Sends emails with event tracking via Configuration Sets
2. **Amazon SNS** - Receives SES events (opens, bounces, etc.) and publishes to subscribers
3. **Amazon SQS** - Queues events for Ghost to poll every 5 minutes
4. **IAM User/Role** - Provides permissions for SES sending and SQS polling

**Event Flow**: SES → SNS Topic → SQS Queue → Ghost Analytics

### Step-by-Step AWS Setup

The following commands will create all required AWS infrastructure. Replace the placeholder values:
- `us-east-1` - Your AWS region
- `123456789012` - Your AWS account ID
- `ses-analytics` - Your SES configuration set name (can be customized)
- `ses-events` - Your SNS topic name (recommended)
- `ses-events-queue` - Your SQS queue name (recommended)

#### 1. Create SNS Topic

```bash
aws sns create-topic --name ses-events --region us-east-1
```

This creates an SNS topic that will receive SES events. Save the returned `TopicArn` for later steps.

#### 2. Create SQS Queue

```bash
aws sqs create-queue \
  --queue-name ses-events-queue \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=345600,ReceiveMessageWaitTimeSeconds=20 \
  --region us-east-1
```

**Queue Attributes Explained**:
- `VisibilityTimeout=300` - 5 minutes for Ghost to process messages before they reappear
- `MessageRetentionPeriod=345600` - Keep messages for 4 days if not processed
- `ReceiveMessageWaitTimeSeconds=20` - Long polling reduces empty responses

Save the returned `QueueUrl` - you'll need this for Ghost's `emailAnalytics.ses.queueUrl` config.

#### 3. Subscribe SQS Queue to SNS Topic

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:ses-events \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:ses-events-queue \
  --region us-east-1
```

Replace the ARNs with your actual Topic ARN and Queue ARN.

#### 4. Set SQS Access Policy

The SQS queue needs permission to receive messages from SNS:

```bash
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/ses-events-queue \
  --attributes Policy='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"sns.amazonaws.com"},"Action":"sqs:SendMessage","Resource":"arn:aws:sqs:us-east-1:123456789012:ses-events-queue","Condition":{"ArnEquals":{"aws:SourceArn":"arn:aws:sns:us-east-1:123456789012:ses-events"}}}]}' \
  --region us-east-1
```

Replace the queue URL and ARNs with your actual values.

#### 5. Create SES Configuration Set

```bash
aws sesv2 create-configuration-set \
  --configuration-set-name ses-analytics \
  --region us-east-1
```

This groups your SES sending settings and event destinations.

#### 6. Create SES Event Destination

**⚠️ CRITICAL: Ghost Click Tracking Configuration**

Ghost wraps links with `/r/` redirects for tracking **before** sending emails. If SES click tracking is enabled, it will double-wrap these links, breaking click tracking entirely (404 errors).

**Therefore**: Configure event tracking with `OPEN` enabled but `CLICK` disabled:

```bash
aws sesv2 put-configuration-set-event-destination \
  --configuration-set-name ses-analytics \
  --event-destination-name to-sns \
  --event-destination '{
    "Enabled": true,
    "MatchingEventTypes": ["SEND","BOUNCE","COMPLAINT","DELIVERY","OPEN","REJECT","RENDERING_FAILURE"],
    "SnsDestination": {
      "TopicArn": "arn:aws:sns:us-east-1:123456789012:ses-events"
    }
  }' \
  --region us-east-1
```

**Event Types Tracked**:
- `SEND` - Email accepted by SES
- `BOUNCE` - Hard or soft bounce
- `COMPLAINT` - Spam complaint
- `DELIVERY` - Successfully delivered
- `OPEN` - Recipient opened email (tracked via pixel)
- `REJECT` - Rejected by SES (invalid email, suppression list)
- `RENDERING_FAILURE` - Template rendering failed

**Event Types NOT Tracked**:
- `CLICK` - Disabled to prevent double-wrapping (Ghost handles click tracking)

#### 7. Verify Configuration

Check that your event destination is configured correctly:

```bash
aws sesv2 get-configuration-set-event-destinations \
  --configuration-set-name ses-analytics \
  --region us-east-1
```

Verify that:
- ✅ `OPEN` is in `MatchingEventTypes`
- ❌ `CLICK` is NOT in `MatchingEventTypes`
- ✅ `SnsDestination.TopicArn` points to your SNS topic

#### 8. IAM Permissions

Your IAM user or role needs these permissions:

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
      "Resource": "arn:aws:sqs:us-east-1:123456789012:ses-events-queue"
    }
  ]
}
```

Replace the SQS ARN with your actual queue ARN.

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
```text
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
