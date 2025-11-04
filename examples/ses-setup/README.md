# Amazon SES Email Adapter - Testing Guide

This directory contains example configuration files and test scripts for setting up and testing the Amazon SES email adapter.

## Files

### Configuration Examples

#### `config.development.json.example`
Example Ghost configuration file showing how to configure the SES adapter.

**Location in your Ghost installation:**
- Copy to project root: `/path/to/Ghost/config.development.json`
- Or in core: `/path/to/Ghost/ghost/core/config.development.json`

**Required Fields:**
```json
{
  "adapters": {
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-west-2",           // AWS region (e.g., us-east-1, eu-west-1)
        "accessKeyId": "AKIA...",         // AWS IAM access key (20 characters)
        "secretAccessKey": "wJal...",     // AWS IAM secret key (40 characters)
        "fromEmail": "newsletter@yourdomain.com",  // Verified sender email
        "configurationSet": "ses-analytics"        // Optional: SES config set name
      }
    }
  }
}
```

**Notes:**
- AWS credentials format: Access keys start with `AKIA`, secret keys are ~40 chars
- The `fromEmail` must be verified in your AWS SES account
- `configurationSet` is optional but recommended for tracking
- Use IAM user with minimal permissions (see below)

### Test Scripts

#### `test-ses-email.js`
Standalone script to test sending a single email through the SES adapter.

**Usage:**
```bash
# From Ghost root directory
node examples/ses-setup/test-ses-email.js
```

**What it does:**
1. Loads Ghost configuration
2. Initializes the SES email adapter
3. Sends a test email to verify everything works
4. Reports success or errors with details

**Before running:**
1. Update config file with your AWS credentials
2. Verify sender email in AWS SES
3. Replace `recipient@example.com` with your test email address

## AWS SES Prerequisites

### 1. Verify Your Sender Email
```bash
# In AWS Console or CLI
aws ses verify-email-identity --email-address newsletter@yourdomain.com
```

### 2. Create IAM User with Minimal Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendRawEmail"
      ],
      "Resource": [
        "arn:aws:ses:us-west-2:123456789012:identity/newsletter@yourdomain.com",
        "arn:aws:ses:us-west-2:123456789012:configuration-set/ses-analytics"
      ]
    }
  ]
}
```

### 3. Create Configuration Set (Optional)
For email analytics tracking:
```bash
aws sesv2 create-configuration-set --configuration-set-name ses-analytics
```

## Testing Checklist

- [ ] AWS credentials added to config file
- [ ] Sender email verified in AWS SES
- [ ] IAM permissions set for SendRawEmail
- [ ] Test recipient email ready
- [ ] Run test script: `node examples/ses-setup/test-ses-email.js`
- [ ] Start Ghost: `yarn dev`
- [ ] Check admin UI shows "Amazon SES is configured"
- [ ] Send test newsletter from Ghost admin
- [ ] Verify email received

## Troubleshooting

### Error: "User is not authorized to perform 'ses:SendRawEmail'"
**Solution:** Add IAM permissions for both the identity (email) and configuration-set resources.

### Error: "MessageRejected: Email address is not verified"
**Solution:** Verify your sender email in AWS SES console or via CLI.

### Error: "Could not load credentials from any providers"
**Solution:** Check that accessKeyId and secretAccessKey are correctly set in config file.

### Newsletter shows 0% open/click rates
**Note:** Full analytics require additional webhook setup (Phase 3). Basic sending works without this.

## Security Notes

⚠️ **Never commit actual AWS credentials to git!**

- Keep config files with real credentials in `.gitignore`
- Use IAM roles with minimal permissions
- Rotate credentials regularly
- Consider using environment variables in production:
  ```bash
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=wJal...
  ```

## Production Configuration

For production, use `config.production.json` with the same structure:

```json
{
  "adapters": {
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-east-1",
        "accessKeyId": "YOUR_PRODUCTION_KEY",
        "secretAccessKey": "YOUR_PRODUCTION_SECRET",
        "fromEmail": "newsletter@yourdomain.com",
        "configurationSet": "production-analytics"
      }
    }
  }
}
```

Or use environment variables (recommended):
```bash
# Ghost will read from adapters:email:ses config
export NODE_ENV=production
```

## Support

For issues or questions:
- Review unit tests: `ghost/core/test/unit/server/adapters/email/ses/`
- Check AWS SES documentation: https://docs.aws.amazon.com/ses/
- Ghost documentation: https://ghost.org/docs/
