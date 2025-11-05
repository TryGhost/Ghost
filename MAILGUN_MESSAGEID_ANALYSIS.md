# Mailgun MessageId Handling Analysis
## Ghost Email Provider Integration & Analytics Tracking

---

## Executive Summary

Ghost's email system uses a **batch-level MessageId tracking** model where each email batch (up to 1000 recipients) receives a single `provider_id` from the email provider. This is stored in the `email_batches.provider_id` column. Analytics events are then matched back to individual recipients by combining the `provider_id` with the recipient's email address, enabling per-recipient event tracking even though only one batch-level ID is persisted.

---

## 1. MessageId Generation & Storage

### 1.1 Mailgun Behavior

**File:** `/ghost/core/core/server/services/email-service/MailgunEmailProvider.js`

Mailgun's `send()` method sends a **batch of up to 1000 personalized recipients in a SINGLE API call**:

```javascript
// Lines 134-138
const response = await this.#mailgunClient.send(
    messageData,
    recipientData,    // Maps recipient.email to their replacements
    []
);

// Returns single MessageId for entire batch (lines 144-146)
return {
    id: response.id.trim().replace(/^<|>$/g, '')  // Single ID!
};
```

**Key Point:** Mailgun's API returns ONE message ID for an entire batch of recipients, not one per recipient.

### 1.2 SES Current Implementation

**File:** `/ghost/core/core/server/adapters/email/ses/index.js` (lines 200-313)

The SES adapter has a **CRITICAL FLAW** - it sends emails **one-at-a-time** in parallel chunks:

```javascript
// Lines 224-260: Sends each recipient individually
const batchPromises = chunk.map(async (recipient) => {
    // ... personalization ...
    const response = await this.#sesClient.send(command);
    return response.MessageId;  // ONE ID PER RECIPIENT
});

// Lines 271-274: Returns only FIRST MessageId
return {
    id: results[0] || 'unknown'  // PROBLEM: Only stores first ID!
};
```

**Critical Issue:** SES sends 50 individual emails but only stores the first MessageId. This breaks analytics because:
- `email_batches.provider_id` = first recipient's MessageId
- Analytics events arrive with different MessageIds for other recipients
- EventProcessor can't map events to batch because `providerId != email_batches.provider_id`

---

## 2. Database Schema - MessageId Storage

### 2.1 Email Batches Table

**File:** `/ghost/core/core/server/data/schema/schema.js` (lines 865-882)

```javascript
email_batches: {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
    provider_id: {type: 'string', maxlength: 255, nullable: true},  // BATCH-LEVEL ID
    status: {...},
    member_segment: {type: 'text', maxlength: 2000, nullable: true},
    error_status_code: {type: 'integer', nullable: true, unsigned: true},
    error_message: {type: 'string', maxlength: 2000, nullable: true},
    error_data: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false}
}
```

**Key Details:**
- **provider_id:** Single string (max 255 chars), stores batch-level ID from provider
- **NOT per-recipient storage** - all 50 recipients in a batch share this ID

### 2.2 Email Recipients Table

**File:** `/ghost/core/core/server/data/schema/schema.js` (lines 883-901)

```javascript
email_recipients: {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
    member_id: {type: 'string', maxlength: 24, nullable: false, index: true},
    batch_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_batches.id'},
    processed_at: {type: 'dateTime', nullable: true},
    delivered_at: {type: 'dateTime', nullable: true},
    opened_at: {type: 'dateTime', nullable: true},
    failed_at: {type: 'dateTime', nullable: true},
    member_uuid: {type: 'string', maxlength: 36, nullable: false},
    member_email: {type: 'string', maxlength: 191, nullable: false},
    member_name: {type: 'string', maxlength: 191, nullable: true},
    // ... indexes ...
}
```

**Key Details:**
- **No provider_id column** - per-recipient data doesn't store provider MessageIds
- Events matched via: `batch_id` → `email_batches.provider_id` + `member_email`

---

## 3. Batch Sending Flow - Where MessageId is Set

### 3.1 BatchSendingService - Storing Provider ID

**File:** `/ghost/core/core/server/services/email-service/BatchSendingService.js` (lines 414-478)

```javascript
// Line 450-462: Call provider's send() method
const response = await this.retryDb(async () => {
    return await this.#sendingService.send({
        emailId: email.id,
        post,
        newsletter,
        segment: batch.get('member_segment'),
        members  // ARRAY of up to 1000 members
    }, {
        openTrackingEnabled: !!email.get('track_opens'),
        clickTrackingEnabled: !!email.get('track_clicks'),
        deliveryTime,
        emailBodyCache
    });
}, {...});

// Lines 466-478: Save batch with provider_id
succeeded = true;
await this.retryDb(
    async () => {
        await batch.save({
            status: 'submitted',
            provider_id: response.id,  // SINGLE ID for all batch members
            error_status_code: null,
            error_message: null,
            error_data: null
        }, {patch: true, require: false, autoRefresh: false});
    },
    {...}
);
```

**Critical Architecture:**
- One `provider_id` is stored per batch
- This ID is the **only reference** between events and the batch
- All 1000 recipients in that batch share this single ID

---

## 4. Analytics Event Matching System

### 4.1 EmailEventProcessor - Matching Events to Recipients

**File:** `/ghost/core/core/server/services/email-service/EmailEventProcessor.js`

The processor uses a **two-step lookup** with provider ID:

```javascript
// Lines 201-227: getRecipient()
async getRecipient(emailIdentification) {
    if (!emailIdentification.emailId && !emailIdentification.providerId) {
        // Protection if both are null or undefined
        return;
    }

    // Step 1: Get emailId from providerId (batch lookup)
    const emailId = emailIdentification.emailId ?? await this.getEmailId(emailIdentification.providerId);
    if (!emailId) {
        return;  // Can't find batch
    }

    // Step 2: Find recipient by email + emailId (recipient lookup)
    const {id: emailRecipientId, member_id: memberId} = await this.#db.knex('email_recipients')
        .select('id', 'member_id')
        .where('member_email', emailIdentification.email)   // FROM EVENT
        .where('email_id', emailId)                          // FROM BATCH LOOKUP
        .first() || {};

    if (emailRecipientId && memberId) {
        return {
            emailRecipientId,
            memberId,
            emailId
        };
    }
}

// Lines 248-264: getEmailId()
async getEmailId(providerId) {
    if (this.providerIdEmailIdMap[providerId]) {
        return this.providerIdEmailIdMap[providerId];
    }

    const {emailId} = await this.#db.knex('email_batches')
        .select('email_id as emailId')
        .where('provider_id', providerId)  // CRITICAL: Lookup by provider_id
        .first() || {};

    if (!emailId) {
        return;
    }

    this.providerIdEmailIdMap[providerId] = emailId;
    return emailId;
}
```

**How This Works for Mailgun:**
1. Mailgun event arrives: `{ providerId: "12345678-abcd", email: "user@example.com" }`
2. Lookup `email_batches` WHERE `provider_id = "12345678-abcd"`
3. Get `email_id` from that batch
4. Lookup `email_recipients` WHERE `email_id = X` AND `member_email = "user@example.com"`
5. Found! Return `emailRecipientId` to update `email_recipients.opened_at` etc.

---

## 5. Mailgun Analytics Provider

### 5.1 Event Fetching

**File:** `/ghost/core/core/server/services/email-analytics/EmailAnalyticsProviderMailgun.js`

```javascript
fetchLatest(batchHandler, options) {
    const mailgunOptions = {
        limit: PAGE_LIMIT,
        event: options?.events ? options.events.join(' OR ') : DEFAULT_EVENT_FILTER,
        tags: this.tags.join(' AND '),  // 'bulk-email' tag
        begin: options.begin ? options.begin.getTime() / 1000 : undefined,
        end: options.end ? options.end.getTime() / 1000 : undefined,
        ascending: 'yes'
    };

    return this.#fetchAnalytics(mailgunOptions, batchHandler, {
        maxEvents: options.maxEvents
    });
}
```

Mailgun events include the original **batch** message ID, which matches what was stored in `email_batches.provider_id`.

### 5.2 Event Processing Workflow

1. **Mailgun webhook/API** → Event includes MessageId
2. **EmailEventProcessor.handleDelivered()** → Creates EmailIdentification with `providerId`
3. **EmailEventProcessor.getRecipient()** → Maps `providerId` to `emailId` to `emailRecipientId`
4. **EmailEventStorage.handleDelivered()** → Updates `email_recipients.delivered_at`

---

## 6. SES Analytics Provider Implementation

**File:** `/ghost/core/core/server/services/email-analytics/EmailAnalyticsProviderSES.js` (lines 1-370)

SES correctly implements the event normalization:

```javascript
// Lines 259-266: Normalize SES event
const normalizedEvent = {
    id: `${messageId}-${eventType}-${Date.now()}`,
    type: ghostEventType,
    recipientEmail: recipientEmail,
    emailId: emailId,
    providerId: messageId,  // EXTRACTED FROM SES EVENT
    timestamp: new Date(event.timestamp || mail.timestamp),
};
```

**The Problem:** SES sends individual emails with different MessageIds, but only stores the first MessageId in `email_batches.provider_id`. When analytics events arrive with other MessageIds, the lookup fails.

---

## 7. Critical Bug Summary

### Current SES Implementation

```
BatchSendingService:
  1. Calls SESEmailProvider.send() with 50 recipients
  
SESEmailProvider.send():
  2. Sends EACH recipient individually via SendRawEmailCommand
  3. Receives 50 different MessageIds from SES
  4. Returns ONLY response.id (results[0])  ← BUG!

BatchSendingService:
  5. Stores response.id in email_batches.provider_id
  
SES Event Arrives:
  6. Event has providerId = second recipient's MessageId
  7. EmailEventProcessor.getEmailId(providerId) queries:
     SELECT email_id FROM email_batches WHERE provider_id = ?
  8. NO MATCH because provider_id = first MessageId, not this one
  9. Analytics event dropped!
```

### Why Mailgun Works

```
MailgunEmailProvider.send():
  1. Sends ONE request with ALL recipients
  2. Mailgun returns ONE MessageId for batch
  3. Returns { id: messageId }

BatchSendingService:
  4. Stores that MessageId in email_batches.provider_id

Mailgun Event Arrives:
  5. Event has providerId = batch MessageId
  6. MATCHES email_batches.provider_id
  7. Lookup succeeds, recipient event is tracked
```

---

## 8. Recommended SES Fix

### Option A: Batch All Recipients Under First MessageId (WRONG)

DON'T store per-recipient MessageIds. This breaks the existing analytics architecture.

### Option B: Send Bulk with Configuration Set (CORRECT)

Modify SES adapter to:
1. Use SES configuration sets to track all emails as one "batch"
2. Add email-id tag to SES request (already done on line 249-253)
3. Return a **deterministic batch ID** based on emailId + timestamp + first recipient

```javascript
// Pseudo-code for fix
async send(data, options = {}) {
    // ... send all recipients ...
    
    // Generate deterministic batch ID based on email
    const batchId = `${data.emailId}-${Date.now()}-${recipients[0].email.split('@')[0]}`;
    
    return {
        id: batchId  // Same ID for all recipients in this batch
    };
}
```

### Option C: Store All MessageIds (ARCHITECTURE CHANGE)

Modify schema to support per-recipient MessageIds:
- Add `email_recipients.provider_id` column (255 chars)
- Update EmailEventProcessor to look up by recipient-level ID
- Major refactoring, not recommended

---

## 9. Personalization Handling Comparison

### Mailgun Personalization

**File:** `/ghost/core/core/server/services/email-service/MailgunEmailProvider.js` (lines 119-130)

```javascript
// Mailgun variable syntax
const recipientData = recipients.reduce((acc, recipient) => {
    acc[recipient.email] = this.#createRecipientData(recipient.replacements);
    return acc;
}, {});

// Replace tokens with Mailgun variables: %recipient.name%
['html', 'plaintext'].forEach((key) => {
    if (messageData[key]) {
        messageData[key] = this.#updateRecipientVariables(messageData[key], replacementDefinitions);
    }
});

// Send ONE request with recipient map
const response = await this.#mailgunClient.send(
    messageData,
    recipientData,  // { email1: {name: "John"}, email2: {name: "Jane"} }
    []
);
```

**Approach:** Sends ONE request with recipient mapping. Mailgun handles per-recipient personalization server-side.

### SES Personalization

**File:** `/ghost/core/core/server/adapters/email/ses/index.js` (lines 224-260)

```javascript
// Per-recipient personalization
chunk.map(async (recipient) => {
    // Process replacements for THIS recipient
    const personalizedHtml = this.#processReplacements(html, recipient.replacements);
    const personalizedPlaintext = this.#processReplacements(plaintext, recipient.replacements);

    // Build personalized MIME email for THIS recipient
    const rawMessage = this.#buildMIMEEmail({
        from: from || this.#config.fromEmail,
        to: recipient.email,      // ONE RECIPIENT
        subject,
        html: personalizedHtml,    // Personalized content
        plaintext: personalizedPlaintext,
        replyTo
    });

    // Send THIS EMAIL
    const response = await this.#sesClient.send(new SendRawEmailCommand({...}));
    return response.MessageId;  // PER-RECIPIENT ID
});
```

**Approach:** Sends 50 individual emails, each personalized. Gets 50 different MessageIds.

---

## 10. Flow Diagram

### Mailgun - Current (Working)

```
Email Batch (50 recipients)
    ↓
MailgunEmailProvider.send([recipient1, recipient2, ...])
    ↓
Mailgun API: Send with recipient variables
    ↓
Response: { id: "msg-12345678-abcd" }  ← ONE ID
    ↓
BatchSendingService.save({ provider_id: "msg-12345678-abcd" })
    ↓
email_batches table:
    id: "batch-123"
    email_id: "email-456"
    provider_id: "msg-12345678-abcd"
    ↓
Mailgun Webhook: { providerId: "msg-12345678-abcd", email: "user1@example.com", type: "delivered" }
    ↓
EmailEventProcessor.getEmailId("msg-12345678-abcd")
    ↓
Query: SELECT email_id FROM email_batches WHERE provider_id = "msg-12345678-abcd"
    ↓
Found: email_id = "email-456"
    ↓
Query: SELECT id FROM email_recipients WHERE email_id = "email-456" AND member_email = "user1@example.com"
    ↓
Found: emailRecipientId = "recipient-789"
    ↓
UPDATE email_recipients SET delivered_at = NOW() WHERE id = "recipient-789"
```

### SES - Current (Broken)

```
Email Batch (50 recipients)
    ↓
SESEmailProvider.send([recipient1, recipient2, ...])
    ↓
Loop: For each recipient, SendRawEmail
    Recipient 1 → Response: { MessageId: "001-msg-xyz1" }
    Recipient 2 → Response: { MessageId: "001-msg-xyz2" }
    ...
    Recipient 50 → Response: { MessageId: "001-msg-xyz50" }
    ↓
Return { id: "001-msg-xyz1" }  ← ONLY FIRST!
    ↓
BatchSendingService.save({ provider_id: "001-msg-xyz1" })
    ↓
email_batches table:
    id: "batch-123"
    email_id: "email-456"
    provider_id: "001-msg-xyz1"  ← Only first recipient's ID!
    ↓
SES Event (Recipient 2): { providerId: "001-msg-xyz2", email: "user2@example.com", type: "delivered" }
    ↓
EmailEventProcessor.getEmailId("001-msg-xyz2")
    ↓
Query: SELECT email_id FROM email_batches WHERE provider_id = "001-msg-xyz2"
    ↓
NOT FOUND! (because provider_id = "001-msg-xyz1")
    ↓
Event dropped, analytics not tracked
```

---

## 11. Key Differences Summary

| Aspect | Mailgun | SES Current | SES Should Be |
|--------|---------|------------|--------------|
| **Recipients per API call** | All (up to 1000) | One (in loop) | All (up to 1000) |
| **MessageIds returned** | 1 batch ID | 50+ individual IDs | 1 deterministic batch ID |
| **Stored in provider_id** | Batch ID | Only first ID (BUG) | Deterministic batch ID |
| **Event matching** | By batch ID + email | Fails for recipients 2-50 | By batch ID + email |
| **Per-recipient personalization** | Server-side (Mailgun API) | Client-side (before send) | Client-side OR server-side |
| **Scaling** | Efficient (batches) | Inefficient (individual sends) | More efficient with grouping |

---

## 12. Implementation Recommendations

### Immediate Fix (PR 8)

In SES adapter `send()` method:

```javascript
// Instead of returning only results[0]:
return {
    id: results[0] || 'unknown'  // BROKEN
};

// Return a deterministic batch ID:
return {
    id: `ses-${data.emailId}-${Date.now()}`
};
```

**Why this works:**
- All recipients in the batch get the same ID
- This ID is deterministic (reproducible)
- It matches the architecture expectation: one ID per batch
- Analytics events with any recipient's MessageId can be mapped back

### Better Solution

Modify SES to batch send requests:

```javascript
// Send in larger groups (50 at a time, not 1)
// But return ONE batch ID for all 50
// This matches Mailgun's architectural pattern
```

### Long-term

Consider per-recipient tracking by:
1. Adding `provider_id` column to `email_recipients`
2. Storing individual SES MessageIds there
3. Updating EmailEventProcessor to support both architectures

---

## Files Reference

| File | Purpose | Key Lines |
|------|---------|-----------|
| `BatchSendingService.js` | Orchestrates batch sending, stores provider_id | 450-478 |
| `MailgunEmailProvider.js` | Sends via Mailgun, returns batch ID | 134-146 |
| `SESEmailProvider.js` | Sends via SES (BROKEN: returns only first ID) | 271-274 |
| `EmailEventProcessor.js` | Maps events to recipients using provider_id | 201-264 |
| `EmailAnalyticsProviderMailgun.js` | Fetches Mailgun events | 31-44 |
| `EmailAnalyticsProviderSES.js` | Fetches SES events via SQS | 224-293 |
| `schema.js` | Defines email_batches.provider_id column | 865-882 |
| `EmailEventStorage.js` | Updates email_recipients with event data | 27-65 |

---

## Conclusion

Ghost's email analytics system is built around **batch-level MessageId tracking**. Each batch of up to 1000 recipients shares a single `provider_id`. Events are matched back to individual recipients by combining this batch ID with the recipient's email address.

**Mailgun works perfectly** because it sends all recipients in one API call and returns one batch ID.

**SES is broken** because it sends individual emails (receiving individual MessageIds) but only stores the first MessageId. When analytics events arrive for recipients 2-50 with different MessageIds, they can't be matched back to the batch, so analytics are lost.

The fix requires either:
1. Returning a deterministic batch ID (not per-recipient IDs), or
2. Modifying the architecture to support per-recipient IDs
