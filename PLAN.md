# Welcome Email Activity Feed Tracking - Implementation Plan

This document breaks down the spike PR into smaller, reviewable pieces.

## Overview

Add welcome emails to the member activity feed so admins can see when members received their welcome email (free or paid).

## PR Breakdown

### PR 1: Database Schema & Model (Foundation)

**Goal:** Create the `automated_email_recipients` table with minimal changes. No behavioral changes.

**Files:**
- `ghost/core/core/server/data/schema/schema.js` - Add table definition
- `ghost/core/core/server/data/migrations/versions/6.15/2026-01-12-16-00-00-add-automated-email-recipients-table.js` - Migration
- `ghost/core/core/server/models/automated-email-recipient.js` - Bookshelf model (immutable)
- `ghost/core/core/server/data/exporter/table-lists.js` - Add to BACKUP_TABLES
- `ghost/core/test/unit/server/data/schema/integrity.test.js` - Update schema hash
- `ghost/core/test/unit/server/models/automated-email-recipient.test.js` - Model tests

**Notes:**
- Table follows `email_recipients` pattern (no FK on `member_id` to allow member deletion while preserving history)
- Model is immutable (throws on edit/destroy) - records are audit logs
- Denormalized member data (`member_uuid`, `member_email`, `member_name`) for point-in-time snapshot

**Testing:** Unit tests for model immutability. Migration can be tested with `yarn knex-migrator migrate`.

---

### PR 2: Backend - Track & Retrieve Welcome Email Events

**Goal:** Record welcome email sends and expose them via the event repository.

**Files:**
- `ghost/core/core/server/services/outbox/handlers/member-created.js` - Record send to `automated_email_recipients`
- `ghost/core/core/server/services/members/members-api/repositories/member-repository.js` - Add `uuid` to outbox payload
- `ghost/core/core/server/services/members/members-api/repositories/event-repository.js` - Add `getAutomatedEmailSentEvents` method
- `ghost/core/core/server/services/members/api.js` - Pass `AutomatedEmailRecipient` to event repository
- `ghost/core/core/server/services/members/members-api/members-api.js` - Accept `AutomatedEmailRecipient` dependency
- `ghost/core/test/unit/server/services/members/members-api/repositories/event-repository.test.js` - Tests

**Depends on:** PR 1 (table must exist)

**Notes:**
- Outbox handler wraps tracking in try/catch - failures don't affect welcome email delivery
- Event repository follows same pattern as `email_recipients` events (sent/delivered/opened)
- Event type: `automated_email_sent_event`

**Testing:**
- Unit tests for event repository
- Integration test: sign up as free member → verify record in `automated_email_recipients`

---

### PR 3: Admin UI - Display Welcome Email Events

**Goal:** Show welcome email events in the member activity feed.

**Files:**
- `ghost/admin/app/helpers/parse-member-event.js` - Add icon and action text for `automated_email_sent_event`
- `ghost/admin/app/utils/member-event-types.js` - Add event type to filter dropdown

**Depends on:** PR 2 (events must be returned by API)

**Notes:**
- Action text: "Received welcome email (Free)" or "Received welcome email (Paid)"
- Uses `sent-email` icon (same as other email events)
- Member-centric language to match other events ("received" not "sent")

**Testing:** Manual testing in admin UI - view member activity feed after signup

---

## Dependency Graph

```
PR 1 (Schema & Model)
    ↓
PR 2 (Backend Tracking & Retrieval)
    ↓
PR 3 (Admin UI)
```

## Migration Notes

- The `automated_email_recipients` table is append-only (no edits/deletes)
- No backfill needed - only tracks welcome emails sent after deployment
- Safe to deploy incrementally - PR 1 and PR 2 have no user-visible changes until PR 3 lands
