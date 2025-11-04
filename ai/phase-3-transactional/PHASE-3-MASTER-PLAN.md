# Phase 3: Amazon SES Transactional Email Integration

## Executive Summary

**EXCELLENT NEWS**: Amazon SES support for transactional emails is ALREADY BUILT INTO GHOST! 🎉

Ghost uses `@tryghost/nodemailer` which has native SES support via AWS SDK v3. Phase 3 is about **configuration, testing, and documentation** - not building new code.

---

## Discovery: Two Separate Email Systems in Ghost

Ghost has completely separate email systems:

### 1. **Transactional Emails** (This Phase!)
- **Purpose**: User actions (invites, password resets, magic links)
- **Volume**: Low (1-100s per day)
- **Service**: `/ghost/core/core/server/services/mail/`
- **Library**: `@tryghost/nodemailer` (wrapper around nodemailer)
- **Config**: `config.mail`
- **SES Support**: ✅ **Already implemented!**

### 2. **Bulk Newsletter Emails** (Phases 1-2)
- **Purpose**: Member newsletters, bulk sending
- **Volume**: High (1000s-100000s)
- **Service**: `/ghost/core/core/server/services/email-service/`
- **Library**: Custom adapter system (EmailProviderBase)
- **Config**: `config.adapters.email`
- **SES Support**: ✅ **You built this in Phase 2!**

---

## Phase 3 Scope

### What We're Doing:
1. **Configure** SES for transactional emails (just config changes!)
2. **Test** all transactional email types with SES
3. **Document** setup process and best practices
4. **Verify** end-to-end email delivery

### What We're NOT Doing:
- ❌ No new code to write (SES already supported!)
- ❌ No adapter pattern needed (different system)
- ❌ No new PRs needed (just configuration)

---

## Transactional Email Types

Ghost sends these transactional emails:

| Email Type | Trigger | Template | Service |
|------------|---------|----------|---------|
| **Password Reset** | User clicks "Forgot password" | `reset-password.html` | `auth/passwordreset.js` |
| **User Invitation** | Admin invites new user | `invite-user.html` | `invites/Invites.js` |
| **API Key Invitation** | API creates invite | `invite-user-by-api-key.html` | `invites/Invites.js` |
| **Magic Link** | Member signs in without password | Generated in code | `lib/magic-link/MagicLink.js` |
| **Welcome Email** | New member signup | `welcome.html` | (optional, configured in settings) |
| **Test Email** | Admin tests email config | `test.html` | `api/endpoints/mail.js` |

---

## Implementation Plan

### Step 1: Update Configuration ✅
**Branch**: Use existing `main` or create `config/ses-transactional`

Update `ghost/core/config.development.json`:
```json
{
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

**Key Insight**: Now BOTH email systems use SES:
- `mail.transport = "ses"` → Transactional emails
- `adapters.email.active = "ses"` → Newsletter emails

### Step 2: Test Each Email Type 🧪
Create test scripts in `examples/ses-transactional-tests/`:

1. **`test-password-reset.js`**
   - Trigger password reset flow
   - Verify email sent via SES
   - Check CloudWatch logs

2. **`test-user-invitation.js`**
   - Create user invitation
   - Verify invite email sent
   - Check token generation

3. **`test-magic-link.js`**
   - Request magic link
   - Verify email sent
   - Test authentication flow

4. **`test-admin-email.js`**
   - Send test email from Ghost admin
   - Verify SES delivery
   - Check email content

### Step 3: Verification & Monitoring 📊

**AWS SES Console Verification**:
- Sending statistics (sends, deliveries, bounces, complaints)
- CloudWatch metrics
- Configuration set analytics (if enabled)

**Ghost Verification**:
- Check Ghost logs for email sending
- Verify no errors in console
- Test actual email delivery to inbox

### Step 4: Documentation 📝

Create comprehensive docs in `ai/phase-3-transactional/`:
- **Setup guide**: Step-by-step SES configuration
- **Testing guide**: How to test each email type
- **Troubleshooting**: Common issues and solutions
- **Migration guide**: Moving from Mailgun to SES

---

## Files to Review/Update

### Core Files (READ ONLY - No changes needed):
```
ghost/core/core/server/services/mail/
├── GhostMailer.js              # Main mailer class
├── index.js                    # Service exports
└── templates/                  # Email templates
    ├── invite-user.html
    ├── reset-password.html
    ├── welcome.html
    └── test.html

node_modules/@tryghost/nodemailer/
└── lib/nodemailer.js           # SES transport implementation
```

### Config Files (UPDATE):
```
ghost/core/
├── config.development.json     # Add SES mail config
└── config.production.json      # Add SES mail config
```

### Example/Test Files (CREATE):
```
examples/ses-transactional-tests/
├── README.md
├── test-password-reset.js
├── test-user-invitation.js
├── test-magic-link.js
└── test-admin-email.js
```

### Documentation (CREATE):
```
ai/phase-3-transactional/
├── PHASE-3-MASTER-PLAN.md      # This file
├── SES-TRANSACTIONAL-SETUP.md  # Configuration guide
├── TESTING-GUIDE.md            # How to test emails
├── TROUBLESHOOTING.md          # Common issues
└── MIGRATION-GUIDE.md          # Mailgun → SES migration
```

---

## Configuration Options

### Option 1: Explicit Credentials (Development)
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

### Option 2: IAM Role (Production - Recommended)
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

### Option 3: Environment Variables
```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "process.env.AWS_REGION",
      "accessKeyId": "process.env.AWS_ACCESS_KEY_ID",
      "secretAccessKey": "process.env.AWS_SECRET_ACCESS_KEY"
    }
  }
}
```

---

## Testing Strategy

### Phase 1: Local Development Testing
1. Configure SES in `config.development.json`
2. Use SES Sandbox (verified email addresses only)
3. Test each email type manually
4. Monitor CloudWatch for delivery

### Phase 2: Integration Testing
1. Create automated test scripts
2. Verify email templates render correctly
3. Check SES sending statistics
4. Test bounce/complaint handling

### Phase 3: Production Verification
1. Move SES out of sandbox
2. Test with real (unverified) email addresses
3. Monitor bounce/complaint rates
4. Verify analytics and tracking

---

## Success Criteria

### ✅ Configuration Complete When:
- [ ] SES configured in `config.development.json`
- [ ] SES configured in `config.production.json`
- [ ] IAM permissions set up correctly
- [ ] Verified email addresses in SES

### ✅ Testing Complete When:
- [ ] Password reset email sends successfully
- [ ] User invitation email sends successfully
- [ ] Magic link email sends successfully
- [ ] Test email from admin works
- [ ] All emails arrive in inbox (not spam)
- [ ] Email templates render correctly

### ✅ Documentation Complete When:
- [ ] Setup guide written and tested
- [ ] Testing guide covers all email types
- [ ] Troubleshooting guide created
- [ ] Migration guide from Mailgun written

### ✅ Production Ready When:
- [ ] All tests passing
- [ ] CloudWatch metrics showing successful delivery
- [ ] Bounce rate < 5%
- [ ] Complaint rate < 0.1%
- [ ] Team trained on monitoring

---

## Benefits of SES for Transactional Emails

### 1. **Cost Savings**
- First 62,000 emails/month: **FREE** (for EC2-hosted apps)
- After that: **$0.10 per 1,000 emails**
- Much cheaper than Mailgun for transactional emails

### 2. **Reliability**
- 99.9% SLA
- Built-in retry logic
- Automatic bounce/complaint handling

### 3. **Single Provider**
- Both transactional AND newsletter emails use SES
- Unified monitoring in CloudWatch
- Consistent deliverability reputation

### 4. **Compliance**
- HIPAA eligible
- GDPR compliant
- SOC 2 certified

### 5. **Observability**
- Detailed CloudWatch metrics
- Configuration sets for analytics
- Bounce/complaint notifications via SNS

---

## Risk Mitigation

### Risk 1: SES Sandbox Limitations
**Mitigation**: Request production access immediately
- Takes 24 hours for AWS to review
- Requires valid use case description
- Must have bounce/complaint handling plan

### Risk 2: Email Deliverability
**Mitigation**: Proper DNS configuration
- Set up SPF records
- Configure DKIM signing
- Add DMARC policy
- Warm up sending reputation gradually

### Risk 3: Rate Limiting
**Mitigation**: Monitor sending limits
- Default: 1 email/second (can request increase)
- Transactional emails are low volume, so not a concern
- Newsletter emails handled by bulk adapter (different limits)

### Risk 4: Bounce/Complaint Handling
**Mitigation**: Set up SNS notifications
- Configure bounce notifications
- Configure complaint notifications
- Implement webhook handler in Ghost (future enhancement)

---

## Next Steps After Phase 3

### Potential Phase 3.5 Enhancements:
1. **Bounce/Complaint Webhook Handler**
   - Listen to SNS notifications
   - Update member email status
   - Add to suppression list automatically

2. **Email Analytics Dashboard**
   - Show delivery rates in Ghost admin
   - Display bounce/complaint metrics
   - Link to CloudWatch logs

3. **Advanced Template Management**
   - Create UI for editing email templates
   - A/B testing for transactional emails
   - Personalization engine

4. **Multi-Provider Failover**
   - Fallback to Mailgun if SES fails
   - Automatic provider switching
   - Health check monitoring

---

## Timeline

### Immediate (Today):
- [x] Research Ghost transactional email system ✅
- [ ] Create Phase 3 folder structure
- [ ] Write configuration guide
- [ ] Configure SES in development

### Day 2:
- [ ] Test all email types
- [ ] Create test scripts
- [ ] Document findings
- [ ] Verify CloudWatch metrics

### Day 3:
- [ ] Write migration guide
- [ ] Create troubleshooting docs
- [ ] Final testing
- [ ] Commit all documentation

---

## Deliverables

### 1. Documentation
- `SES-TRANSACTIONAL-SETUP.md` - Setup guide
- `TESTING-GUIDE.md` - Testing procedures
- `TROUBLESHOOTING.md` - Common issues
- `MIGRATION-GUIDE.md` - Mailgun to SES

### 2. Examples
- `examples/ses-transactional-tests/` - Test scripts
- `config.development.json.example` - Config template

### 3. Updates
- Updated `AGENTS.md` - Add Phase 3 info
- Updated main README - Add SES transactional docs

---

## Conclusion

Phase 3 is **configuration and testing** - not code development. Ghost already has full SES support for transactional emails via `@tryghost/nodemailer`.

This makes the migration path simple:
1. Configure SES in `mail` config
2. Test each email type
3. Monitor delivery in AWS
4. Deploy to production

**Estimated Effort**: 1-2 days (vs. 1-2 weeks if we had to build it!)

**Risk Level**: Low (using existing, battle-tested code)

**Value**: Complete SES migration for all Ghost emails 🎉
