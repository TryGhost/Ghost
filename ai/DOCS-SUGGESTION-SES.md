# Suggested Documentation Addition for https://docs.ghost.org/newsletters

## Proposed New Section: Amazon SES (Self-hosted)

Add this section after the existing Mailgun documentation for self-hosted users.

---

### Amazon SES

Self-hosted Ghost installs can configure Amazon SES for bulk email newsletters. SES is free for up to 3,000 emails per month when sending from EC2, and has competitive pricing beyond that.

**Configuration**: Add to your `config.production.json`:

```json
{
  "adapters": {
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-east-1",
        "fromEmail": "noreply@yourdomain.com",
        "configurationSet": "ghost-analytics"
      }
    }
  }
}
```

**AWS Setup**: You'll need:
- Verified domain in Amazon SES
- Production access (out of sandbox mode)
- IAM permissions: `ses:SendEmail`, `ses:SendRawEmail`

**Optional - Email Analytics**: Track opens and bounces by adding SQS:

```json
{
  "emailAnalytics": {
    "ses": {
      "queueUrl": "https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/ses-events",
      "region": "us-east-1"
    }
  }
}
```

Requires: SES Configuration Set → SNS Topic → SQS Queue

**Manual Setup Steps**:

1. Create SES Configuration Set:
   ```bash
   aws sesv2 create-configuration-set --configuration-set-name ghost-analytics --region us-east-1
   ```

2. Create SNS Topic:
   ```bash
   aws sns create-topic --name ses-events --region us-east-1
   ```

3. Create SQS Queue:
   ```bash
   aws sqs create-queue --queue-name ses-events --region us-east-1
   ```

4. Subscribe SQS to SNS:
   ```bash
   aws sns subscribe --topic-arn arn:aws:sns:REGION:ACCOUNT:ses-events \
     --protocol sqs --notification-endpoint arn:aws:sqs:REGION:ACCOUNT:ses-events
   ```

5. Configure SES event destination:
   ```bash
   aws sesv2 create-configuration-set-event-destination \
     --configuration-set-name ghost-analytics \
     --event-destination-name ses-to-sns \
     --event-destination '{"SnsDestination":{"TopicArn":"arn:aws:sns:REGION:ACCOUNT:ses-events"},"MatchingEventTypes":["OPEN","BOUNCE","COMPLAINT"]}'
   ```

More info: [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

---

## Implementation Notes for Ghost Team

**What This Enables:**
- Self-hosted users can use Amazon SES as an alternative to Mailgun
- Supports both transactional and bulk email
- Optional email analytics (opens, bounces, complaints)

**Configuration Files:**
- Example configs provided: `config.development.json.example`, `config.production.json.example`
- All config files follow existing Ghost patterns

**Setup Script Location:**
The referenced `scripts/setup-ses-infrastructure.sh` should be added to the Ghost repository at release time. This script automates:
- Creating SNS topic for SES events
- Creating SQS queue with proper attributes
- Subscribing SQS to SNS
- Creating SES Configuration Set
- Setting up event destinations (with CLICK tracking disabled - critical for Ghost's native click tracking)

**Why CLICK Tracking Must Be Disabled:**
Ghost wraps newsletter links with `/r/` redirects for click tracking before sending. If SES click tracking is enabled, it double-wraps these links, causing 404 errors and breaking analytics entirely.

**Technical Users:**
This documentation assumes self-hosted users are comfortable with:
- AWS Console or CLI
- JSON configuration files
- IAM permissions

**Testing:**
This implementation is production-validated on danielraffel.me with 1000+ members.
