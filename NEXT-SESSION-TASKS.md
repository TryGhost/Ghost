# Ghost SES Integration - Next Session Tasks

## Status Summary

**✅ COMPLETED:**
- All SES code implementation (PR5, PR6, PR7, PR8)
- Production testing and validation
- Email sending ✅ (Amazon SES working)
- Email analytics ✅ (Click tracking: 100%, Open tracking: 100%)
- Critical bug fixes (IIFE → getter in public-config.js)
- Documentation updates (SES setup guide with click tracking warnings)
- Production deployment script (`production-test-manual.sh`)

**🔧 KNOWN ISSUES:**
- Admin UI shows "Mailgun" instead of "Amazon SES" (cosmetic only, backend works correctly)
  - Cause: Production has vanilla Ghost 6.5.3 admin assets, not PR8 built assets
  - Fix: Build and deploy admin UI from PR8 branch

---

## 🎯 Task 1: Build Admin UI with SES Email Provider Component

**Goal:** Compile the React admin UI that includes the EmailProvider component

**Branch:** `personalization/ses-personalization-pr8`

**Steps:**
```bash
cd /Users/danielraffel/Code/Ghost

# Ensure on PR8 branch
git checkout personalization/ses-personalization-pr8

# Build entire Ghost (includes admin UI compilation)
yarn build

# This creates production-ready assets at:
# ghost/core/core/built/admin/assets/admin-x-settings/admin-x-settings.js
```

**Build Time:** ~5-10 minutes (full monorepo build with Nx)

**What Gets Built:**
- Ember admin app (`ghost.js` - 3.9MB)
- React admin-x apps:
  - `admin-x-settings` (includes EmailProvider.tsx) - 127KB
  - `posts`, `activitypub`, `stats`
- CSS, fonts, other assets

**Output Directory:**
```
/Users/danielraffel/Code/Ghost/ghost/core/core/built/admin/
├── index.html
├── assets/
│   ├── ghost.js
│   ├── ghost.css
│   ├── admin-x-settings/
│   │   ├── admin-x-settings.js  ← Contains EmailProvider component
│   │   ├── index-*.mjs (chunks)
│   │   └── *.map
│   ├── activitypub/
│   ├── posts/
│   └── stats/
```

---

## 🚀 Task 2: Deploy Built Admin Assets to Production

**Goal:** Replace vanilla Ghost 6.5.3 admin assets with PR8 built assets

**Production Server:** `35.212.246.12` (danielraffel.me)

**Steps:**

### 2.1 Create Deployment Package
```bash
cd /Users/danielraffel/Code/Ghost

# After yarn build completes, create tarball
cd ghost/core/core/built
tar -czf ~/admin-ses-assets.tar.gz admin/

# Verify size (should be ~6-8MB compressed)
ls -lh ~/admin-ses-assets.tar.gz
```

### 2.2 Upload to Production
```bash
# Copy to production
scp -i ~/.ssh/gcp ~/admin-ses-assets.tar.gz \
  service_account@35.212.246.12:/tmp/

# SSH into production
ssh -i ~/.ssh/gcp service_account@35.212.246.12
```

### 2.3 On Production Server
```bash
cd /var/www/ghost

# Stop Ghost
ghost stop

# Backup current admin assets
sudo cp -r versions/6.5.3/core/built/admin \
  /tmp/admin-backup-$(date +%Y%m%d-%H%M%S)

# Extract new assets
cd versions/6.5.3/core/built
sudo rm -rf admin/
sudo tar -xzf /tmp/admin-ses-assets.tar.gz
sudo chown -R ghost:ghost admin/

# Restart Ghost
cd /var/www/ghost
ghost restart

# Verify Ghost is running
ghost status

# Check logs for any errors
ghost log | tail -20
```

### 2.4 Verify in Browser
1. Open `https://danielraffel.me/ghost/`
2. Log in
3. Go to Settings → Email
4. **Should now show "Amazon SES" instead of "Mailgun"**
5. Hard refresh (Cmd+Shift+R) if needed

**Rollback if Needed:**
```bash
# If something breaks
cd /var/www/ghost
ghost stop

cd versions/6.5.3/core/built
sudo rm -rf admin/
sudo cp -r /tmp/admin-backup-TIMESTAMP admin/
sudo chown -R ghost:ghost admin/

cd /var/www/ghost
ghost restart
```

---

## 📝 Task 3: Submit PRs to Ghost Repository

**Goal:** Submit all 4 PRs for Ghost team review

**PR Order:** Must be submitted in dependency order
1. PR5 → PR6 → PR7 → PR8
2. Each PR depends on the previous one

### Pre-Submission Checklist

**For Each PR:**
- [ ] All commits follow Ghost commit message format (emoji, past tense, issue link)
- [ ] No credentials or sensitive data in any files
- [ ] Tests pass locally
- [ ] No uncommitted changes
- [ ] Branch is pushed to YOUR fork (danielraffel/Ghost, not TryGhost/Ghost)

### 3.1 Push All Branches to Your Fork

**Current Branch Status:**
```
Local Branches:
- adapter/email-provider-base     (PR5)
- adapter/email-provider-ses      (PR6)
- analytics/ses-analytics-pr7     (PR7)
- personalization/ses-personalization-pr8 (PR8)

Remote: Need to push to https://github.com/danielraffel/Ghost.git
```

**Push Commands:**
```bash
cd /Users/danielraffel/Code/Ghost

# Add your fork as remote (if not already)
git remote add danielraffel https://github.com/danielraffel/Ghost.git

# Push each branch
git push danielraffel adapter/email-provider-base
git push danielraffel adapter/email-provider-ses
git push danielraffel analytics/ses-analytics-pr7
git push danielraffel personalization/ses-personalization-pr8
```

### 3.2 Create Pull Requests on GitHub

Go to https://github.com/TryGhost/Ghost/compare

**PR5: Email Provider Base Adapter**
- Base: `TryGhost/Ghost:main`
- Compare: `danielraffel/Ghost:adapter/email-provider-base`
- Title: `✨ Added base adapter architecture for email providers`
- Description template at: `/Users/danielraffel/Code/Ghost/ai/phase-1-2-mailgun-ses/PR5-EMAIL-PROVIDER-BASE.md`

**PR6: Amazon SES Email Provider**
- Base: `TryGhost/Ghost:main` (will merge with PR5)
- Compare: `danielraffel/Ghost:adapter/email-provider-ses`
- Title: `✨ Added Amazon SES email provider adapter`
- Description template at: `/Users/danielraffel/Code/Ghost/ai/phase-1-2-mailgun-ses/PR6-SES-ADAPTER.md`

**PR7: SES Email Analytics**
- Base: `TryGhost/Ghost:main` (will merge with PR5+PR6)
- Compare: `danielraffel/Ghost:analytics/ses-analytics-pr7`
- Title: `✨ Added SES email analytics with SQS integration`
- Description template at: `/Users/danielraffel/Code/Ghost/ai/phase-1-2-mailgun-ses/PR7-SES-ANALYTICS.md`

**PR8: SES Email Personalization**
- Base: `TryGhost/Ghost:main` (will merge with PR5+PR6+PR7)
- Compare: `danielraffel/Ghost:personalization/ses-personalization-pr8`
- Title: `✨ Added personalization support for SES bulk emails`
- Description template at: `/Users/danielraffel/Code/Ghost/ai/phase-1-2-mailgun-ses/PR8-SES-PERSONALIZATION.md`

**Important Notes:**
- All PRs target `main` branch (not `next` or `develop`)
- Link each PR to related issue (if exists)
- Add labels: `email`, `enhancement`, `feature`
- Request reviewers from Ghost team (optional initially)
- Be prepared to respond to review comments

### 3.3 PR Dependencies

**Dependency Chain:**
```
PR5 (EmailProviderBase)
  └─ Required by PR6

PR6 (SES Adapter)
  └─ Depends on PR5
  └─ Required by PR7

PR7 (SES Analytics)
  └─ Depends on PR5 + PR6
  └─ Required by PR8

PR8 (SES Personalization)
  └─ Depends on PR5 + PR6 + PR7
```

**Merge Strategy:**
- Ghost team will likely merge PR5 first
- Then PR6, PR7, PR8 in sequence
- OR they may request you combine into fewer PRs
- Be flexible to team preferences

---

## 🔍 Verification After Deployment

### Backend (Already Working)
- [x] Emails send via Amazon SES
- [x] SQS analytics integration working
- [x] Click tracking: 100%
- [x] Open tracking: 100%
- [x] Configuration API returns `{active: "ses", isConfigured: true}`

### Frontend (After Task 2)
- [ ] Admin UI displays "Amazon SES" in Settings → Email
- [ ] Configuration status shows "Amazon SES is set up" with checkmark
- [ ] No console errors
- [ ] All other admin functionality works normally

---

## 📦 Current Repository Status

### ghost-ses-patcher Repository
**Location:** `/Users/danielraffel/Code/ghost-ses-patcher/`

**Files:**
- `production-test-manual.sh` ✅ (tested, working)
- `setup-aws-infrastructure.sh` 🚧 (incomplete stub)
- `.env.example` ✅
- `.env` ✅ (gitignored)
- `.gitignore` ✅
- `IMPLEMENTATION_NOTES.md` ✅
- `QUICK_START.md` ✅

**Status:** Not yet a git repository

**To Initialize (Optional):**
```bash
cd /Users/danielraffel/Code/ghost-ses-patcher
git init
git add .
git commit -m "Initial commit: Ghost SES deployment tooling"
git remote add origin https://github.com/danielraffel/ghost-ses-patcher.git
git push -u origin main
```

### Main Ghost Repository
**Location:** `/Users/danielraffel/Code/Ghost/`
**Current Branch:** `personalization/ses-personalization-pr8`

**Uncommitted Changes:** None (all production fixes committed)

**Remote Branches to Push:**
- `adapter/email-provider-base`
- `adapter/email-provider-ses`
- `analytics/ses-analytics-pr7`
- `personalization/ses-personalization-pr8`

---

## 🚨 Important Reminders

1. **Never commit credentials**
   - config.development.json has AWS keys (gitignored)
   - .env has AWS keys (gitignored)

2. **Admin UI is cosmetic only**
   - Backend fully functional regardless of UI display
   - Only deploy admin assets if you want correct UI labels

3. **SES Click Tracking**
   - MUST be disabled in AWS configuration set
   - Already configured correctly on your account
   - Document for others in PRs

4. **Testing Timeline**
   - Production has lots of content, migrations take time
   - Allow extra time for Ghost restarts on production
   - Have backup plan (VM snapshot) before major changes

---

## 📞 Support Resources

**Ghost Documentation:**
- Contributing: https://github.com/TryGhost/Ghost/blob/main/.github/CONTRIBUTING.md
- Development: https://ghost.org/docs/install/local/
- API: https://ghost.org/docs/admin-api/

**Your Documentation:**
- SES Setup: `/Users/danielraffel/Code/Ghost/ai/phase-2-ses/SETUP-GUIDE.md`
- PR Templates: `/Users/danielraffel/Code/Ghost/ai/phase-1-2-mailgun-ses/PR*.md`
- Production Script: `/Users/danielraffel/Code/ghost-ses-patcher/production-test-manual.sh`

**AWS Documentation:**
- SES: https://docs.aws.amazon.com/ses/
- SQS: https://docs.aws.amazon.com/sqs/
- SNS: https://docs.aws.amazon.com/sns/

---

## ✅ Quick Start for Next Session

```bash
# 1. Build admin UI (5-10 min)
cd /Users/danielraffel/Code/Ghost
git checkout personalization/ses-personalization-pr8
yarn build

# 2. Deploy to production (5 min)
cd ghost/core/core/built
tar -czf ~/admin-ses-assets.tar.gz admin/
scp -i ~/.ssh/gcp ~/admin-ses-assets.tar.gz service_account@35.212.246.12:/tmp/
# Then follow deployment steps above

# 3. Submit PRs
git push danielraffel adapter/email-provider-base
git push danielraffel adapter/email-provider-ses
git push danielraffel analytics/ses-analytics-pr7
git push danielraffel personalization/ses-personalization-pr8
# Then create PRs on GitHub
```

---

**Last Updated:** 2025-11-05
**Session Owner:** Daniel Raffel
**Status:** Ready for deployment & PR submission
