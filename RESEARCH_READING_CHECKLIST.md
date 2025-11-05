# Research Reading Checklist

## Phase 1: Orientation (5 minutes)

- [ ] Read this checklist
- [ ] Open RESEARCH_INDEX.md
- [ ] Choose your reading path (Quick, Complete, or Expert)

## Phase 2: Quick Path (15 minutes total)

**Goal:** Understand the problem and solution quickly

- [ ] Read RESEARCH_SUMMARY.md
  - [ ] Understand the batch-level architecture
  - [ ] See why Mailgun works (1 API call, 1 ID)
  - [ ] See why SES fails (50 individual calls, 50 IDs, only storing 1)
  - [ ] Understand how analytics matching works
  
- [ ] Read SES_FIX_IMPLEMENTATION_GUIDE.md sections:
  - [ ] "Quick Summary"
  - [ ] "Root Cause Analysis" 
  - [ ] "Fix Implementation" (Option 3 - Best)

- [ ] Record key insight in your notes:
  ```
  Problem: SES sends 50 individual emails, gets 50 different MessageIds,
  but only stores the first one. Analytics events 2-50 fail to match.
  
  Solution: Return a deterministic batch ID that represents all 50 recipients.
  ```

**Time checkpoint:** 15 minutes ✓ Ready to implement

---

## Phase 2: Complete Path (1 hour total)

**Goal:** Thoroughly understand the architecture before implementing

### Section A: Overview (10 minutes)
- [ ] Read RESEARCH_SUMMARY.md
  - [ ] Understand Ghost's batch-level MessageId architecture
  - [ ] See Mailgun reference implementation
  - [ ] Understand the SES bug
  - [ ] See the two-step analytics matching

### Section B: Deep Analysis (30 minutes)
- [ ] Read MAILGUN_MESSAGEID_ANALYSIS.md sections:
  - [ ] "1. MessageId Generation & Storage" (Mailgun vs SES)
  - [ ] "2. Database Schema - MessageId Storage"
  - [ ] "3. Batch Sending Flow - Where MessageId is Set"
  - [ ] "4. Analytics Event Matching System"
  - [ ] "7. Critical Bug Summary" (with flow diagrams)

### Section C: Implementation Prep (15 minutes)
- [ ] Read SES_FIX_IMPLEMENTATION_GUIDE.md
  - [ ] "Quick Summary"
  - [ ] "Root Cause Analysis" 
  - [ ] "Fix Implementation" (all 3 options)
  - [ ] "Why This Fix Works"
  - [ ] "Testing the Fix"

### Section D: Review (5 minutes)
- [ ] Create mental model of the flow:
  ```
  Email Batch (50 recipients)
      ↓
  SESEmailProvider.send()
      ├─ Send each recipient individually
      ├─ Collect all MessageIds
      └─ Return ONE deterministic ID ← FIX HERE
      ↓
  BatchSendingService.save({ provider_id: ID })
      ↓
  All 50 recipients share same provider_id
      ↓
  When events arrive, analytics lookup succeeds for all 50
  ```

**Time checkpoint:** 1 hour ✓ Ready to implement with confidence

---

## Phase 2: Expert Path (2+ hours total)

**Goal:** Deep mastery and design confidence

### Section A: Overview & Summary (15 minutes)
- [ ] RESEARCH_INDEX.md - understand structure
- [ ] RESEARCH_SUMMARY.md - key findings
- [ ] Write 1-paragraph summary in your own words

### Section B: Complete Technical Analysis (45 minutes)
- [ ] MAILGUN_MESSAGEID_ANALYSIS.md - ENTIRE DOCUMENT
  - [ ] Read all 12 sections
  - [ ] Study all code snippets
  - [ ] Trace through flow diagrams
  - [ ] Review all tables
  - [ ] Create your own mental diagram

### Section C: Comprehensive Implementation Guide (30 minutes)
- [ ] SES_FIX_IMPLEMENTATION_GUIDE.md - ENTIRE DOCUMENT
  - [ ] Study all 3 fix options
  - [ ] Understand trade-offs
  - [ ] Review test examples
  - [ ] Study impact analysis
  - [ ] Plan your test strategy

### Section D: Code Review (30+ minutes)
- [ ] Open actual code files in your editor:
  - [ ] `ghost/core/core/server/adapters/email/ses/index.js`
  - [ ] `ghost/core/core/server/services/email-service/MailgunEmailProvider.js`
  - [ ] `ghost/core/core/server/services/email-service/EmailEventProcessor.js`
  - [ ] `ghost/core/core/server/services/email-service/BatchSendingService.js`
  
- [ ] For each file, locate:
  - [ ] The key method/function
  - [ ] How it relates to the problem
  - [ ] How the fix applies

### Section E: Implementation Planning (15+ minutes)
- [ ] Design your fix (choose from 3 options)
- [ ] Plan unit tests
- [ ] Plan integration tests  
- [ ] Plan manual testing
- [ ] Prepare commit message

**Time checkpoint:** 2+ hours ✓ Ready to implement like an expert

---

## Key Questions to Answer (All Paths)

By the end of your reading, you should be able to answer:

- [ ] What is Ghost's MessageId architecture? (batch-level, not per-recipient)
- [ ] How many MessageIds does Mailgun get? (one for the entire batch)
- [ ] How many MessageIds does SES get? (one per recipient)
- [ ] Where is the SES bug? (only returns first MessageId)
- [ ] Why does this break analytics? (events 2-50 have different IDs, lookup fails)
- [ ] What's the solution? (return deterministic batch ID for all recipients)
- [ ] Do we need schema changes? (no, existing provider_id column works)
- [ ] Is this backward compatible? (yes, completely)
- [ ] How do we test it? (verify all recipients appear in analytics)
- [ ] What file needs changing? (SESEmailProvider.js lines 271-274)

---

## Code Location Quick Reference

```javascript
// BUG LOCATION: SESEmailProvider.js (lines 271-274)
return {
    id: results[0] || 'unknown'  // ← Returns only FIRST MessageId
};

// SHOULD BE: (after fix)
const batchId = results[0] || `ses-${data.emailId}-${Date.now()}`;
return {
    id: batchId  // ← Returns same ID for all batch recipients
};
```

---

## Notes Space

### Your Understanding After Reading:

**Problem Summary:**
```
[Write in your own words what the problem is]
```

**Solution Summary:**
```
[Write in your own words what the fix does]
```

**Critical Insight:**
```
[What surprised you or was most important to understand]
```

**Implementation Confidence:**
```
[Rate 1-10 how confident you are to implement this fix]
```

---

## Before You Start Implementing

Confirm you can answer YES to all:

- [ ] Do I understand Ghost's batch-level MessageId architecture?
- [ ] Do I understand why Mailgun works and SES fails?
- [ ] Do I understand the two-step analytics matching process?
- [ ] Do I know exactly which 2 lines of code need to change?
- [ ] Do I have a testing strategy?
- [ ] Have I reviewed the example code in the guides?
- [ ] Do I know where the bug file is located?
- [ ] Do I understand this is backward compatible?
- [ ] Do I understand no schema migration is needed?
- [ ] Am I ready to implement?

---

## After Implementation Checklist

- [ ] Code change applied
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing completed (10+ recipients)
- [ ] No errors in logs
- [ ] Analytics showing for all recipients (not just #1)
- [ ] PR created with commit message
- [ ] PR description references analysis documents
- [ ] PR ready for review

---

**Good luck with your reading and implementation!**

Start with: RESEARCH_INDEX.md

