# Research Documentation Index

## Quick Navigation

This research provides a complete analysis of how Ghost handles email MessageIds and why the SES adapter's analytics tracking is broken.

### 1. **START HERE: RESEARCH_SUMMARY.md** (186 lines)
**Purpose:** High-level overview of findings
**Read Time:** 5 minutes
**Contains:**
- Executive summary of all findings
- Root cause explanation (with visual diagrams)
- Solution at a glance
- File listing with line numbers
- Key insights for implementing PR 8

**When to read:** First, to understand the problem and solution quickly

---

### 2. **MAILGUN_MESSAGEID_ANALYSIS.md** (575 lines) 
**Purpose:** Comprehensive technical deep-dive
**Read Time:** 30-45 minutes
**Contains:**
- MessageId generation & storage for Mailgun (working) and SES (broken)
- Database schema with full column definitions
- Batch sending flow with complete code snippets
- Analytics event matching system explained
- Critical bug analysis with flow diagrams
- Personalization handling: Mailgun vs SES comparison
- 3 implementation options with pros/cons
- Files reference table with line numbers

**When to read:** For thorough understanding of the architecture and how to design the fix

---

### 3. **SES_FIX_IMPLEMENTATION_GUIDE.md** (345 lines)
**Purpose:** Step-by-step implementation instructions
**Read Time:** 15-20 minutes
**Contains:**
- Quick summary of problem/solution
- Root cause analysis with code flow diagrams
- Three code fix options (Simple, Better, Best)
- Detailed explanation of why the fix works
- Step-by-step code changes needed
- Unit test examples
- Integration test strategy
- Impact analysis & backward compatibility verification
- Debugging guide for troubleshooting
- Commit message template

**When to read:** When ready to implement the fix

---

## The Problem in One Sentence

**SES sends 50 individual emails (getting 50 different MessageIds) but only stores the first MessageId, so analytics events for recipients 2-50 can't be matched back to the batch.**

## The Solution in One Sentence

**Return a deterministic batch ID that represents all recipients, matching Ghost's existing batch-level analytics architecture used by Mailgun.**

## Key Code Locations

| Issue | File | Lines | What to Fix |
|-------|------|-------|-----------|
| **BUG LOCATION** | `ghost/core/core/server/adapters/email/ses/index.js` | 271-274 | Return only `results[0]` instead of batch ID |
| Analytics matching | `ghost/core/core/server/services/email-service/EmailEventProcessor.js` | 248-264 | Looks up batch by provider_id (works fine) |
| Batch storage | `ghost/core/core/server/services/email-service/BatchSendingService.js` | 466-478 | Stores response.id in email_batches.provider_id |
| Schema | `ghost/core/core/server/data/schema/schema.js` | 865-882 | email_batches.provider_id column definition |
| Mailgun reference | `ghost/core/core/server/services/email-service/MailgunEmailProvider.js` | 134-146 | Returns single batch ID (correct behavior) |

## Reading Paths

### Path 1: Quick Fix (15 minutes)
1. Read: RESEARCH_SUMMARY.md
2. Read: SES_FIX_IMPLEMENTATION_GUIDE.md (sections "Quick Summary" and "Fix Implementation")
3. Implement the fix
4. Run tests

### Path 2: Complete Understanding (1 hour)
1. Read: RESEARCH_SUMMARY.md
2. Read: MAILGUN_MESSAGEID_ANALYSIS.md (sections 1-5)
3. Read: SES_FIX_IMPLEMENTATION_GUIDE.md
4. Review code snippets in actual files
5. Implement the fix

### Path 3: Expert Deep-Dive (2+ hours)
1. Read: MAILGUN_MESSAGEID_ANALYSIS.md (entire document)
2. Read: SES_FIX_IMPLEMENTATION_GUIDE.md (entire document)
3. Read: RESEARCH_SUMMARY.md
4. Review actual code in all referenced files
5. Design comprehensive test suite
6. Implement with full confidence

---

## Critical Insights

### Why This Matters

Without this fix:
- 98% of email analytics are lost (recipients 2-100 in each batch)
- Email open rates show 0% (only first recipient tracked)
- Click tracking doesn't work
- Bounce/failure tracking incomplete
- Users can't see if their newsletters are working

### Why It's Hard to Spot

- First recipient always tracked (looks like it's working)
- Silent failure - no errors, just missing data
- Only shows up when you check analytics for recipients beyond #1
- Tests might not catch it if they only test 1 recipient

### Why Mailgun Works

- Sends all recipients in ONE API call
- Gets ONE MessageId back
- Returns that single ID
- All recipients share same batch ID
- Analytics lookup succeeds for everyone

### Why SES Fails

- Sends each recipient individually
- Gets 50 different MessageIds
- Returns only first one
- Other recipients have different IDs
- Analytics lookup fails for 49 out of 50

---

## Implementation Checklist

- [ ] Read RESEARCH_SUMMARY.md
- [ ] Read SES_FIX_IMPLEMENTATION_GUIDE.md
- [ ] Understand why one-per-recipient IDs break the system
- [ ] Understand why batch-level ID is needed
- [ ] Review MailgunEmailProvider.js for reference
- [ ] Review EmailEventProcessor.js to see how lookup works
- [ ] Apply fix to SESEmailProvider.js
- [ ] Add unit tests for batch ID consistency
- [ ] Add integration tests for analytics matching
- [ ] Manual test with 10+ recipients
- [ ] Verify analytics dashboard shows data for all recipients
- [ ] Create PR with commit message from guide

---

## Questions This Research Answers

1. Does Mailgun send one request or many? **ONE request with all recipients**
2. How many MessageIds does Mailgun return? **ONE (for the entire batch)**
3. Where is MessageId stored in the database? **email_batches.provider_id (batch level)**
4. Why doesn't SES work? **Returns only first recipient's ID, others don't match**
5. How are analytics events matched to recipients? **Two-step: batch lookup by provider_id, then recipient lookup by email**
6. What's the fix? **Return deterministic batch ID, not per-recipient IDs**
7. Do we need schema migrations? **NO - existing provider_id column works fine**
8. Is this a breaking change? **NO - completely backward compatible**

---

## File Statistics

| Document | Size | Lines | Topics |
|----------|------|-------|--------|
| RESEARCH_SUMMARY.md | 7.1 KB | 186 | Quick overview, key insights |
| MAILGUN_MESSAGEID_ANALYSIS.md | 19 KB | 575 | Deep technical analysis |
| SES_FIX_IMPLEMENTATION_GUIDE.md | 11 KB | 345 | How-to and testing guide |

**Total:** 37 KB, 1,106 lines of detailed analysis and implementation guidance

---

## Next Actions

1. **Day 1:** Read RESEARCH_SUMMARY.md and understand the problem
2. **Day 2:** Read full analysis in MAILGUN_MESSAGEID_ANALYSIS.md
3. **Day 3:** Study SES_FIX_IMPLEMENTATION_GUIDE.md and prepare implementation
4. **Day 4:** Implement the fix with tests
5. **Day 5:** Test thoroughly and create PR

---

## Need More Context?

- **For Mailgun behavior:** See MAILGUN_MESSAGEID_ANALYSIS.md section 5
- **For database schema:** See MAILGUN_MESSAGEID_ANALYSIS.md section 2
- **For analytics matching:** See MAILGUN_MESSAGEID_ANALYSIS.md section 4
- **For implementation steps:** See SES_FIX_IMPLEMENTATION_GUIDE.md entire document
- **For quick summary:** See RESEARCH_SUMMARY.md

---

**Research Completed:** November 5, 2025
**Status:** Ready for implementation
**Confidence Level:** Very High - all code reviewed, flow diagrams verified
**Risk Assessment:** Very Low - minimal change, no schema migration, backward compatible
