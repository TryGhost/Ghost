# Welcome Email E2E Coverage Plan

## Summary
Expand `e2e/` welcome-email coverage from mostly admin-settings persistence checks into behavior-level mailbox assertions for both free and paid member flows. Keep the existing settings/UI tests that validate editing surfaces, but shift critical confidence to end-to-end delivery tests that verify what a real recipient gets and when they get it.

The intent of this plan is to cover:
- free signup welcome emails
- paid signup and upgrade welcome emails
- disabled/no-send behavior
- customization and sender metadata reaching delivered mail
- activity/event visibility where it reflects the product contract

## Key Changes
### 1. Keep and narrow the purpose of the current admin settings suite
Update `e2e/tests/admin/settings/member-welcome-emails.test.ts` so it is explicitly the admin configuration suite.

Keep:
- free toggle enable/disable UI coverage
- free subject/body persistence in the modal
- customization modal visibility, tab switching, and persistence
- labs-flag visibility checks
- one delivery-backed customization test, but simplify it so it only proves customization reaches the delivered email

Update:
- remove the direct-API assertion pattern where a stronger mailbox assertion can replace it
- replace "TODO: full E2E functionality" checks with actual E2E assertions where feasible
- add paid settings coverage beyond toggle enable only if the paid edit surface is already available in UI; otherwise leave settings-level paid coverage minimal and push behavior checks into public flows

Remove:
- redundant API-backed assertions that only re-check storage state already implied by subsequent UI reload or mailbox delivery
- comments indicating incomplete E2E coverage once mailbox-based tests exist

### 2. Add a dedicated public delivery suite for free-member welcome emails
Create or expand a public-facing suite, preferably alongside `e2e/tests/public/member-signup.test.ts`, focused only on email delivery semantics.

Add tests:
- `free signup sends welcome email after signup completion`
  - seed active free welcome email
  - sign up through Portal
  - confirm the first email is the signup/magic-link email
  - complete signup via magic link
  - assert a welcome email arrives
  - assert sender, subject, text, and HTML all match expectations
- `free signup does not send welcome email when free automation is disabled`
  - disable or do not create the free welcome email
  - complete signup
  - assert no welcome email matching the recipient/subject arrives within a bounded wait
- `free signup delivers edited subject and body`
  - configure subject/body through admin UI before signup
  - complete signup
  - assert the delivered subject/body use the edited content rather than defaults
- `free signup sends welcome email exactly once`
  - complete signup
  - poll/search mailbox and assert one welcome email for that recipient, not just "at least one"

Update existing test:
- `received welcome email` in `e2e/tests/public/member-signup.test.ts`
  - strengthen it or replace it with the new happy-path test above
  - avoid overlap with a separate customization-focused admin test

### 3. Add paid-member delivery coverage
Introduce paid welcome-email behavior tests using the existing paid Portal and Stripe flows in `e2e/helpers/playwright/flows/signup.ts` and `e2e/helpers/playwright/flows/upgrade.ts`.

Add tests:
- `paid signup sends paid welcome email`
  - enable or seed `member-welcome-email-paid`
  - create/select a paid tier
  - complete paid signup through fake Stripe
  - assert the delivered email matches the paid welcome automation, not the free one
- `paid signup does not send paid welcome email when paid automation is disabled`
  - complete paid signup with paid welcome automation inactive
  - assert no paid welcome email arrives
- `free signup does not trigger paid welcome email`
  - protect against automation misrouting between free and paid paths
- `paid signup does not trigger free welcome email`
  - if product contract is one-email-per-trigger, codify that explicitly

Add one upgrade-path test after locking the intended product behavior:
- `free to paid upgrade sends paid welcome email` or
- `free to paid upgrade does not send paid welcome email`

Default assumption for the plan: upgrades should get their own explicit test because they are a high-risk regression area and currently uncovered. If product behavior is "no paid welcome on upgrade," the test should assert absence.

### 4. Add delivery-backed customization and metadata coverage
Use mailbox assertions to validate the parts most likely to regress during large welcome-email changes.

Add tests:
- `custom sender metadata is used in delivered welcome email`
  - seed/configure sender name, sender email, and reply-to
  - assert delivered headers reflect configuration
- `general customization settings are reflected in delivered HTML`
  - at minimum cover footer text
  - add publication-title hidden/shown if the resulting HTML has a stable signal
  - add badge hidden/shown if the resulting HTML has a stable signal
- `design customization is reflected in delivered HTML`
  - keep one stable design assertion such as font family or button style
  - avoid overly brittle full-markup snapshots

Defaults:
- prefer semantic HTML/text assertions over exact template snapshots
- use one or two stable style assertions only, not exhaustive visual email snapshotting

### 5. Extend activity/event coverage to match behavior coverage
Keep the existing free-path activity test in `e2e/tests/admin/members-legacy/member-activity-events.test.ts`.

Add:
- `paid welcome email event appears in member activity feed` if paid sends are expected to generate a distinct activity event
- `no welcome email event when welcome email is not sent` only if the event model is important enough to warrant a negative assertion; otherwise rely on delivery tests and keep activity coverage positive-path only

## Test Plan
### Tests to add
- Public:
  - free signup sends welcome email after signup completion
  - free signup does not send welcome email when disabled
  - free signup delivers edited subject/body
  - free signup sends welcome email exactly once
  - paid signup sends paid welcome email
  - paid signup does not send paid welcome email when disabled
  - free signup does not trigger paid welcome email
  - paid signup does not trigger free welcome email
  - free to paid upgrade behavior test for paid welcome email
- Admin:
  - paid welcome email activity event appears, if applicable
  - sender metadata reaches delivered mail
  - one stable delivered-HTML customization assertion for general settings
  - one stable delivered-HTML customization assertion for design settings

### Tests to update
- `e2e/tests/public/member-signup.test.ts`
  - refactor current welcome-email test into the new free happy-path baseline
- `e2e/tests/admin/settings/member-welcome-emails.test.ts`
  - convert API-state checks to stronger UI reload or mailbox assertions where possible
  - keep it focused on admin config rather than end-to-end delivery semantics
- `e2e/tests/admin/members-legacy/member-activity-events.test.ts`
  - add paid-path event coverage if the product emits one

### Tests to remove
- Remove redundant API-only checks in the admin settings suite once equivalent mailbox-backed or UI-reload-backed assertions are present.
- Do not remove the existing free event/activity test; keep it as separate coverage for the admin audit trail.
- Do not add snapshot-style email-template tests unless a stable harness already exists; they would be brittle and lower-signal than mailbox assertions.

## Interfaces and Helper Changes
Add helper support where needed, but keep interfaces minimal:
- Extend the automated email seeding helper so tests can easily create both `member-welcome-email-free` and `member-welcome-email-paid` with custom subject/body/sender fields.
- Add a mailbox helper for negative assertions:
  - search for a matching welcome email and assert zero results after a bounded wait
- Add a mailbox helper for count assertions:
  - assert exactly one matching message for recipient + subject or recipient + sender + subject
- Reuse existing paid signup and upgrade flows rather than inventing new checkout helpers.

No public product API changes are required for this test plan.

## Assumptions
- Paid welcome emails are a distinct automation with slug `member-welcome-email-paid`, and the intended recipient-visible behavior should be validated through mailbox inspection rather than admin API state alone.
- MailPit is the authoritative source for delivery assertions in `e2e/`.
- Upgrade behavior is important enough to codify explicitly because the user called out extensive ongoing changes in this area.
- The suite should prefer a small number of strong end-to-end assertions over many API-backed storage assertions.
- If sender/reply-to fields are not yet configurable in current admin UI, seed them through factories in delivery tests rather than blocking coverage on UI support.
