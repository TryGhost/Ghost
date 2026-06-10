# Story 3 — Portal: collect at signup

**Goal:** the owner can add an existing custom field to the signup form (or link out to create a new one), and Portal renders those fields dynamically and captures values on signup.

**Status:** Not started

**Depends on:** Stories 0 and 1.

## Two parts

### A. Admin: add field to the signup form

In the Portal customization "Signup options" tab (`apps/admin-x-settings/.../portal/signup-options.tsx`):
- "Add field" control mirroring beehiiv: **Action** (use existing field), **Field** (pick from existing definitions), **Type** (read-only from the definition), **Placeholder**, **Required** (Yes/No).
- A link/CTA to create a new field (routes to Story 1's section).
- Reorder placed fields. Persist to `repo.setForm('signup', placements)`.

### B. Portal: render + collect

In `apps/portal/src/components/pages/signup-page.js`:
- `getInputFields()` reads `repo.getForm('signup')` + the referenced definitions and appends inputs after email/name.
- Per-placement `required` enforced client-side at submit (storage stays nullable).
- On signup, capture values and `repo.setValue(newMemberId, fieldId, value)` (faked member id for the POC).

## Tasks

- [ ] Admin "Add field" dialog (existing-field picker + placeholder + required).
- [ ] Link to create-new-field.
- [ ] Persist signup placements via repo.
- [ ] Portal renders placed fields dynamically (Tier 1 controls).
- [ ] Collection-time required validation per placement.
- [ ] Save values on signup.
- [ ] Tier 2: select control in Portal (decide single/multi widget).

## Done = demoable

Owner adds a field to the signup form, sets it required; the signup form shows it, blocks submit if required and empty, and stores the value.
