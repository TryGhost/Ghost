# Story 3 — Portal: collect at signup (unified Form fields list)

**Goal:** the Portal "Signup options" tab becomes a single **Form fields** list that mixes the built-in fields (Email, Name) with placed custom fields. The owner curates the signup form from one place, and Portal renders it dynamically and captures values on signup.

**Status:** Not started

**Depends on:** Stories 0 and 1.

## Design: one unified Form fields list

Replaces the old "add a field" picker with a single ordered list in `apps/admin-x-settings/.../portal/signup-options.tsx`. The grammar distinguishes built-in from custom by *how you control them*:

| Row | Source | Control | Notes |
| --- | --- | --- | --- |
| **Email** | built-in (system) | none — **Required · Locked** | Always present, can't remove or make optional. |
| **Name** | built-in | **on/off toggle** | Maps to today's `portal_name` setting. Toggle, not add/remove, because it's a built-in. "Short text · Optional". |
| **Custom field** (e.g. Favorite player, Birthday) | custom | **`…` menu** (edit placement / remove) + Required/Optional | Added via "+ Add field". Each is a `signup` placement. |
| **+ Add field** | — | dashed button | Opens the existing-field picker (or link to create a new one in Story 1's section). |

- **Drag to reorder** the whole list; order persists (built-in + custom share one ordering).
- Surrounding bits stay: **Available tiers**, **Legal & consent** (Display notice = `portal_signup_terms`). Optional nicety: a **form-length** hint ("longer forms may reduce signups").

This is the integration point that reconciles built-in fields with the placement model: built-in fields = toggle/locked; custom fields = add/remove placements on the `signup` surface.

## Challenge: drag-to-reorder including built-in fields

Today the order is **hardcoded** in Portal (`signup-page.js` `getInputFields`): `email` leads the array and `Name` is `unshift`ed *above* it when `portal_name` is on, with `tabIndex` 1/2 and `autoFocus` pinned to `fields[0]`. Nothing is data-driven, which is why Name always sits above Email.

To make the unified list reorderable (Email / Name / custom fields in any order):

- **Built-in fields need to live in the ordered list**, not just custom placements. Our `forms.signup` currently holds only custom placements. Either add pseudo-entries for `email`/`name` (with an `order` and a `system`/`builtin` flag) or keep a parallel order array. Cleanest: one ordered list where each entry is system (email/name) or a custom placement.
- **Portal `getInputFields` must render from that saved order** instead of the hardcoded array; `autoFocus` and `tabIndex` derived from final position.
- **Email stays required/locked** even if moved; reordering is presentation-only (email is still the identity).
- **Honeypot (`phonenumber`)** stays hidden and appended, never user-orderable.
- Backend reality (future): email/name are real member columns; their order is purely a presentation setting stored alongside the placements.

Scope note: drag-reorder of built-ins is the trickiest part of this story. We can ship a first version that reorders custom fields and toggles Name, then layer full cross-built-in reordering.

## Two parts

### A. Admin: the unified list
- Render Email (locked) + Name (toggle → `portal_name`) + custom `signup` placements, in one reorderable list.
- "+ Add field" picks an existing custom field (or links to create one); set Required + placeholder per placement.
- Persist custom placements via `repo.setForm('signup', placements)`; Name via the existing `portal_name` setting.

### B. Portal: render + collect
In `apps/portal/src/components/pages/signup-page.js`:
- `getInputFields()` renders Email + (Name if enabled) + the `signup` placements in saved order.
- Per-placement `required` enforced client-side at submit (storage stays nullable).
- On signup, capture values and `repo.setValue(newMemberId, fieldId, value)` (faked member id for the POC).

## Tasks

- [ ] Admin: unified Form fields list (Email locked, Name toggle, custom rows with `…`/Required, drag-reorder).
- [ ] "+ Add field" existing-field picker (+ placeholder/required per placement); link to create-new-field.
- [ ] Persist signup placements via repo; Name via `portal_name`.
- [ ] Portal renders the list dynamically (Tier 1 controls).
- [ ] Collection-time required validation per placement.
- [ ] Save values on signup.
- [ ] Tier 2: select control in Portal (decide single/multi widget — no design system here).

## Done = demoable

Owner sees Email/Name plus any custom fields in one list, toggles Name, adds a custom field as required, reorders them; the signup form reflects it, blocks submit on missing required values, and stores the values.
