# Story 4 — Portal: self-edit on account page

**Goal:** a logged-in member can view and update their own custom field values from the "Your account" page.

**Status:** Not started

**Depends on:** Stories 0, 1, and the account-form placements (`forms.account`).

## Surface

`apps/portal/src/components/pages/account-profile-page.js` (the Edit profile view behind the account page "Edit" action).

## UX

- **Opt-in (locked decision):** the account page shows ONLY the fields the owner placed on the `account` surface. It does not show all custom fields by default. Internal/admin-only fields never appear because they are simply never placed here.
- The account/profile edit form lists the fields in `repo.getForm('account')`, each pre-filled with the member's current value.
- Member edits and saves; values persist via `repo.setValue(memberId, fieldId, value)`.
- Per-placement `required` enforced at submit. Stored values remain nullable.

## Tasks

- [ ] `getInputFields()` appends account-surface custom fields after name/email.
- [ ] Pre-fill from `repo.getValues(memberId)`.
- [ ] Render Tier 1 controls (text/number/boolean).
- [ ] Required validation per placement at save.
- [ ] Save changed values via repo.
- [ ] Tier 2: select control.

## Done = demoable

A member opens their account page, sees their custom field values, edits one, saves, and the change persists (and shows in the admin member detail from Story 2).
