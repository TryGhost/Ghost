# Story 4 — Portal: self-edit on account page

**Goal:** a logged-in member can view and update their own custom field values from the "Your account" page.

**Status:** ✅ Done.

**Depends on:** Stories 0, 1, 3 (the account page reuses the signup placement list).

## Surface

`apps/portal/src/components/pages/account-profile-page.js` (the Edit profile view behind the account page "Edit" action).

## UX (connected Portal model)

- **The account page mirrors the signup form** (POC simplification): it shows the same custom fields the owner added to the signup form, so members self-edit whatever was collected. No separate `account` surface/configurator.
- Reads `repo.getForm('signup')`, filters to the custom-field placements (built-in Email/Name entries are dropped — Name/Email are already editable above), pre-filled with the member's values (keyed by real `member.id`).
- Renders each via the shared `CustomFieldInput` control (text/number/boolean/select), with the greyed select placeholder.
- A placed field is required; validation reuses the page's existing error flow with a label-based message. Values persist on **Save** via `repo.setValue(member.id, …)`, alongside the existing name/email update.

## Built

- `apps/portal/src/components/common/custom-field-input.js` — shared per-type control (also used by signup).
- `apps/portal/src/components/pages/account-profile-page.js` — loads signup placements + member values, renders custom fields after Name/Email, validates required, persists on Save.

## Tasks

- [ ] `getInputFields()` appends account-surface custom fields after name/email.
- [ ] Pre-fill from `repo.getValues(memberId)`.
- [ ] Render Tier 1 controls (text/number/boolean).
- [ ] Required validation per placement at save.
- [ ] Save changed values via repo.
- [ ] Tier 2: select control.

## Done = demoable

A member opens their account page, sees their custom field values, edits one, saves, and the change persists (and shows in the admin member detail from Story 2).
