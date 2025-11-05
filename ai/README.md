# /ai Folder - Multi-Provider Email Adapter Implementation

This folder contains planning, implementation guides, and documentation for Ghost's multi-provider email adapter system.

---

## 📁 Folder Structure (Phase-Based)

```
/ai/
├── README.md                          # 👈 This file - Phase roadmap & overview
│
├── phase-1-foundation/                # ✅ COMPLETE - Base adapter system (PRs 1-4)
│   ├── README.md                      # Phase 1 overview & architecture
│   ├── ADAPTER-IMPLEMENTATION-MASTER-PLAN.md
│   ├── SETUP-GUIDE.md                 # Mailgun testing requirements
│   ├── ENCAPSULATION-FIX.md
│   ├── FEEDBACK-RESPONSE.md
│   ├── PR*-*.md                       # PR reviews & responses
│   └── lessons/                       # Lessons learned
│
├── phase-2-ses/                       # 🔜 NEXT - Amazon SES support (PRs 5-10)
│   ├── README.md                      # Phase 2 overview & plan
│   ├── SETUP-GUIDE.md                 # AWS infrastructure setup (IAM, SES, SNS, SQS)
│   ├── implementation-plan.md         # Detailed 6-PR implementation plan
│   └── config.txt                     # Your AWS configuration (READY TO TEST!)
│
├── phase-3-postmark/                  # 🔜 PLANNED - Postmark support (PRs 11-13)
│   ├── README.md                      # Phase 3 overview & plan
│   ├── SETUP-GUIDE.md                 # Postmark account & testing setup
│   └── implementation-plan.md         # Detailed implementation plan
│
├── archive/                           # Historical documents (reference)
└── archive-factory-approach/          # Old factory pattern work (archived)
```

---

## 🎯 Quick Navigation

### Working on a Specific Phase?

- **Phase 1 (Foundation)**: See [phase-1-foundation/README.md](./phase-1-foundation/README.md) - ✅ COMPLETE
- **Phase 2 (Amazon SES)**: See [phase-2-ses/README.md](./phase-2-ses/README.md) - 🔜 Next up (READY TO TEST!)
- **Phase 3 (Postmark)**: See [phase-3-postmark/README.md](./phase-3-postmark/README.md) - 🔜 After SES

### Need Setup Instructions?

- **Mailgun Testing**: [phase-1-foundation/SETUP-GUIDE.md](./phase-1-foundation/SETUP-GUIDE.md) (if exists)
- **Amazon SES Testing**: [phase-2-ses/SETUP-GUIDE.md](./phase-2-ses/SETUP-GUIDE.md)
- **Postmark Testing**: [phase-3-postmark/SETUP-GUIDE.md](./phase-3-postmark/SETUP-GUIDE.md)

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE

**Goal**: Establish email adapter system using Ghost's AdapterManager

**PRs**:
- ✅ PR1: Email Provider Base https://github.com/TryGhost/Ghost/pull/25250
- ✅ PR2: Mailgun Email Provider https://github.com/TryGhost/Ghost/pull/25251
- ✅ PR3: Email Analytics Adapter https://github.com/TryGhost/Ghost/pull/25252
- ✅ PR4: Email Suppression Adapter https://github.com/TryGhost/Ghost/pull/25253

**Achievement**:
- Adapter pattern proven with Mailgun
- Zero breaking changes
- 800+ tests passing
- Foundation ready for additional providers

---

### Phase 2: Amazon SES Support 🔜 NEXT (READY!)

**Goal**: Add high-value provider with 80% cost savings

**Strategy**: Implement SES first (AWS infrastructure already configured and ready to test)

**PRs**:
- 🔜 PR5: SES Email Provider
- 🔜 PR6: Wire SES Provider
- 🔜 PR7: SES Analytics Adapter (SQS polling)
- 🔜 PR8: Wire SES Analytics
- 🔜 PR9: SES Suppression Adapter
- 🔜 PR10: Wire SES Suppression

**Testing Requirements** ✅ COMPLETE:
- ✅ AWS account (ID: 248189932905)
- ✅ IAM users (ses-smtp-user, ses-api-user)
- ✅ Verified domain (danielraffel.me)
- ✅ Production access approved
- ✅ SQS queue + SNS topics configured
- ✅ SES Configuration Set (ses-analytics)

**Value Proposition**:
- **Cost**: $52/month vs $250/month (Mailgun) for 500k emails
- **Savings**: 80% reduction
- **Scalability**: AWS infrastructure handles millions

**Dependencies**:
- Optional AWS SDK v3 (~350KB total, only for SES users)

**Timeline**: 2-3 weeks

**See**: [phase-2-ses/](./phase-2-ses/) for complete plan

---

### Phase 3: Postmark Support 🔜 AFTER SES

**Goal**: Add third provider option, leverage patterns from SES implementation

**Strategy**: Can borrow MIME building, batch handling, and event patterns from SES

**PRs**:
- 🔜 PR11: Postmark Email Provider
- 🔜 PR12: Postmark Analytics Adapter
- 🔜 PR13: Postmark Suppression Adapter

**Testing Requirements**:
- Postmark account (free tier: 100 emails/month)
- Server API token
- Verified sender signature
- Webhook URL (ngrok for local testing)

**Patterns to Reuse**:
- MIME email building (from SES)
- Batch recipient handling (from SES)
- Token replacement for personalization
- Event normalization (provider → Ghost format)
- Real-time webhook processing

**Timeline**: 1-2 weeks

**See**: [phase-3-postmark/](./phase-3-postmark/) for complete plan

---

## 📋 Testing Requirements Summary

### Phase 1: Mailgun (COMPLETE)
- Mailgun account with verified domain
- API key
- DKIM/SPF configured

### Phase 2: Amazon SES (NEXT - READY!)
- ✅ AWS account
- ✅ IAM user with SES permissions
- ✅ Verified domain (with DKIM/SPF/DMARC)
- ✅ Production access approval
- ✅ SQS queue (for analytics)
- ✅ SNS topics (for analytics)
- ✅ SES Configuration Set

### Phase 3: Postmark (FUTURE)
- Postmark account (free tier OK)
- Server API token
- Verified email or domain
- Webhook URL (optional for analytics)

**All setup guides include step-by-step instructions!**

---

## 🏗️ Architecture Overview

### Three Adapter Types

1. **Email Provider** (`adapters/email/`)
   - Sends bulk emails
   - Providers: Mailgun ✅, Postmark 🔜, SES 🔜
   - Required method: `send(data, options)`

2. **Email Analytics** (`adapters/email-analytics/`)
   - Fetches email events (opens, clicks, bounces)
   - Providers: Mailgun ✅, Postmark 🔜, SES 🔜
   - Required method: `fetchLatest(options)`

3. **Email Suppression** (`adapters/email-suppression/`)
   - Manages bounce/complaint suppression lists
   - Providers: Mailgun ✅, Postmark 🔜, SES 🔜
   - Required methods: `getSuppressionData()`, `getBulkSuppressionData()`, `removeEmail()`

### Configuration Pattern

**Config-Only Selection** (no UI changes initially):

```json
{
  "adapters": {
    "email": {
      "active": "postmark",  // or "mailgun" or "ses"
      "mailgun": { /* mailgun config */ },
      "postmark": {
        "apiKey": {"$env": "POSTMARK_API_KEY"},
        "fromEmail": "verified@yourdomain.com"
      },
      "ses": {
        "region": "us-east-1",
        "accessKeyId": {"$env": "AWS_ACCESS_KEY_ID"},
        "secretAccessKey": {"$env": "AWS_SECRET_ACCESS_KEY"}
      }
    }
  }
}
```

**Only one provider active at a time** (enforced by `active` config)

---

## 📊 Current Status

**Active Phase**: Phase 1 Complete ✅
**Next Phase**: Phase 2 (Amazon SES) - Ready to start (AWS configured!)
**Overall Progress**: 4/13 PRs complete (31%)

---

## ⚠️ Critical Rules

### 1. **Always Branch from `main`**
```bash
# ✅ CORRECT
git checkout main
git pull origin main
git checkout -b adapter/email-provider-postmark

# ❌ WRONG - Never branch from another feature branch
git checkout adapter/email-provider-mailgun
git checkout -b adapter/email-provider-postmark  # DON'T!
```

**Why?** Prevents branch contamination where PRs accidentally include code from other PRs.

### 2. **Verify Before Creating PR**
```bash
# Check what changed compared to main
git diff --name-status main...HEAD

# Should ONLY see files for YOUR PR, not others!
```

### 3. **Keep PRs Small**
- Each PR: 10-200 lines
- Single responsibility
- Independently reviewable
- Follow "smallest change" principle

### 4. **Test with Real Accounts**
- Validate with actual provider (Postmark account, AWS account)
- Don't submit until working end-to-end
- Document any issues discovered

---

## 🎯 Success Metrics

### Phase 1 ✅
- ✅ Zero breaking changes
- ✅ Adapter pattern proven
- ✅ 800+ tests passing
- ✅ All PRs merged

### Phase 2 (Amazon SES)
- [ ] SES works end-to-end
- [ ] 80% cost savings validated
- [ ] AWS infrastructure working (already configured!)
- [ ] Zero breaking changes
- [ ] All tests passing

### Phase 3 (Postmark)
- [ ] Postmark works end-to-end
- [ ] Patterns reused from SES implementation
- [ ] Zero breaking changes
- [ ] All tests passing

---

## 🔗 Important Links

### Documentation
- **Ghost Adapter Docs**: https://docs.ghost.org/config#adapters
- **AdapterManager Source**: `ghost/core/core/server/services/adapter-manager/`

### Phase READMEs
- [Phase 1 Foundation](./phase-1-foundation/README.md)
- [Phase 2 Amazon SES](./phase-2-ses/README.md)
- [Phase 3 Postmark](./phase-3-postmark/README.md)

### Setup Guides
- [Amazon SES Setup](./phase-2-ses/SETUP-GUIDE.md)
- [Postmark Setup](./phase-3-postmark/SETUP-GUIDE.md)

---

## 💡 Key Decisions

### Why SES Before Postmark?

1. **Ready to Test**: AWS infrastructure already configured and production-approved
2. **High Value**: 80% cost savings proves value immediately
3. **Pattern Establishment**: MIME building, batching, event handling patterns created for Postmark reuse
4. **User Priority**: Can start testing immediately with existing AWS setup

### Why Config-Only (No UI)?

1. **Consistency**: Matches existing adapter patterns (storage, cache, SSO)
2. **Simplicity**: No DB migrations or UI state management
3. **Community**: Works same way for community adapters
4. **Defensive**: Can add UI later if maintainers approve

### Why Optional Dependencies?

1. **Size**: Don't bloat Ghost for non-SES users
2. **Choice**: Only install what's needed
3. **Pattern**: Follows Ghost's existing approach (sqlite3)

---

## 📚 Lessons Learned (Phase 1)

See [phase-1-foundation/lessons/](./phase-1-foundation/lessons/) for:

- **Maintainer Feedback**: "Smallest change", "Build confidence", "Config-driven first"
- **Testing Solutions**: How to test EmailServiceWrapper, bypass Nx daemon issues
- **Code Review**: Ignore bot docstring warnings, follow existing patterns
- **Branch Management**: Always branch from main, verify before PR

---

## 📦 Archived Work

### Factory Approach (Archived October 25, 2025)

Original implementation used custom factory pattern. Pivoted to AdapterManager based on community feedback.

**Location**: [archive-factory-approach/](./archive-factory-approach/)

**Why Archived?**
- Community suggested using Ghost's existing adapter system
- Factory pattern didn't enable community extensibility
- Nothing was merged, so pivot was low-cost

**Still Useful?**
- Domain understanding
- Test fixtures
- Documentation insights

---

## 🚦 Getting Started

### New to This Project?

1. **Read**: [phase-1-foundation/README.md](./phase-1-foundation/README.md) - Understand the foundation
2. **Review**: [phase-1-foundation/ADAPTER-IMPLEMENTATION-MASTER-PLAN.md](./phase-1-foundation/ADAPTER-IMPLEMENTATION-MASTER-PLAN.md) - See the architecture
3. **Next**: [phase-2-ses/README.md](./phase-2-ses/README.md) - Start working on Amazon SES

### Ready to Implement?

1. **Setup**: Follow the appropriate SETUP-GUIDE.md for your phase
2. **Plan**: Read the phase README.md for implementation details
3. **Branch**: Create feature branch from `main`
4. **Implement**: Follow the patterns from Phase 1
5. **Test**: Validate with real provider account
6. **PR**: Submit when working end-to-end

---

## 📈 Timeline

- **Phase 1**: Complete (4 weeks)
- **Phase 2**: 2-3 weeks (Amazon SES)
- **Phase 3**: 1-2 weeks (Postmark)
- **Total**: ~6-8 weeks from start to all providers complete

---

**Last Updated**: November 3, 2025 (Phase-based reorganization)
