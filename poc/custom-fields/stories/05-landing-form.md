# Story 5 — Landing form: collect custom fields from existing members

**Goal:** an owner can turn on a **Landing form** that asks existing members for a chosen set of custom fields, shown as a soft card when the member next lands on the site, reaching members regardless of how they signed up.

**Status:** Done (Part A + Part B).

**Depends on:** Stories 0 and 1 (field definitions + the shared `CustomFieldInput` control). Independent of the Portal signup/account work, it's a new surface.

## Why a separate surface (not part of signup)

- **Signup form / account page = the Portal surface.** It collects from *new* signups (and lets them self-edit). It misses members created via import, the Admin API, or Stripe checkout, and anyone who signed up before a field existed.
- **Landing form = a second surface that targets *all* existing members.** It enriches profiles after the fact. The only moment shared by every member regardless of source is **landing back on the site while authenticated** (free → magic-link landing, paid → Stripe `?stripe=success` landing, others → first authenticated visit).
- It is a **member-state prompt, not a signup step**: soft, non-blocking, keyed off member state, surfaced wherever the member next appears. (A blocking/forced gate is a v2 path.)

## Model

- A new collection **surface** (`landing`) with its own **independently curated** placement list (separate from the Portal signup list).
- A **feature on/off toggle** — the owner turns the Landing form on.
- **Placements** = the custom fields to collect. Reuse the Form-fields list component (custom fields only, no built-in Email/Name). The field's **label is the prompt**; no per-question titles/types (beehiiv has those, we keep it simple, see CHALLENGES / OVERVIEW).
- **Pending = implicit** (the member is missing a value for a placed field) **+ a per-member `dismissed` flag** so "Not now" stops the nag. Show the card when: feature enabled **and** member authenticated **and** missing any placed field **and** not dismissed.
- **Placed = required at collection**, but the card is **non-blocking** (dismissable).

## Triggers → all reduce to one rule

| Trigger | Population reached |
| --- | --- |
| Magic-link landing | Free Portal signups |
| Stripe `?stripe=success` landing | Paid signups |
| Any later authenticated landing | Import / API members, returners |
| Email link ("complete your profile") | Members who never return to the site |

All of these are the same check: **enabled + authenticated member + pending + not dismissed → show the card.** The POC simulates them with "Portal load while logged in" + a URL param for the email route. No source-specific code.

## Surfaces / files

- **Admin (admin-x-settings):** a new Membership section **"Landing form"**. Sidebar reordered to: Access → Tiers → Signup portal → **Custom fields → Landing form** → Welcome emails → Newsletters (Landing form sits next to Custom fields since it's about collecting them). The section = an on/off toggle + the field list (reused component) + "New custom field".
- **Portal:** a soft, dismissible card injected over whatever page the member lands on (Portal's own DOM root, theme-independent). Renders the missing fields via `CustomFieldInput`; **Save** (persist) / **Not now** (dismiss). An email-link URL param force-opens it.
- **Repo (`poc/custom-fields/repo.js`):** `landing` placements, an `enabled` setting, per-member `dismissed` state. Seed + version bump.

## Build order

- **Part A — admin (done):** repo additions + the "Landing form" section (toggle + field list) + sidebar reorder.
- **Part B — Portal (done):** the injected card + trigger + dismiss + email-link param.

## Tasks

- [x] Repo: `landing` placements, `enabled` setting, per-member `dismissed` state; seed + version bump.
- [x] Admin: "Landing form" Membership section (toggle + field list, reuse the signup Form-fields component, custom fields only); sidebar reorder.
- [x] Portal: injected soft card (missing fields, Save / Not now), trigger on authenticated landing, dismiss persistence, email-link param.
- [x] Required-at-collection validation (placed = required), non-blocking.

## Part A as built (admin)

- The section follows the **Welcome-emails** pattern: a top-right **"Customize"** button opens the modal, and a single `List` row ("All members", detail "Shown to members on their next visit") carries the enable `Toggle` (bound to the repo `landingFormEnabled` setting). In Story 5.5 the row becomes a per-form list and "Customize" becomes "Add landing form".
- The modal reuses the **Portal `PreviewModalContent`** two-pane layout: live preview left, sidebar right with **General / Segmentation** tabs (`TabView`, same as the Portal modal). General holds the shared field picker; **Segmentation is a placeholder** for Story 5.5. No intro/description copy in the sidebar (Portal/Announcement modals don't show one), and the tab body uses Portal's exact `<div className='mt-7'><Form>` wrapper for spacing.
- The field picker is the **same `FormFieldsList` component** used by signup (`surface='landing'`, custom fields only, no built-in Email/Name rows, no `updateSetting`). One component, two surfaces, no duplicated drag-and-drop/picker logic.
- The live preview (`landing-preview.tsx`) is a **hand-built static mock** (the signup preview is the real Portal iframe; there is no Portal iframe for an injected landing card yet). Its Save button is matched to the real `.gh-portal-btn` (44px height, 6px radius, weight 500, ~15px, accent bg) and reads `accent_color`.

## Part B as built (Portal)

- **`LandingCard`** (`apps/portal/src/components/landing-card.js`, wired into `App.js`) renders in its own `Frame` (isolated iframe), the same pattern as `Notification`. The show-rule: feature enabled **and** member authenticated **and** missing a placed `landing` field **and** not dismissed. `?cf_landing` force-opens it (the email route) and shows all placed fields.
- Reuses the shared **`CustomFieldInput`** control, the real **`ActionButton`** (accent), Save persists each value, **Not now**/close sets a persisted per-member `dismissed` flag. A session `closed` guard stops a repo change-notification from reopening it after save/dismiss.
- **Cross-surface key = `uuid`.** The Portal member exposes only `uuid` (no `id`), so the card, the account page, and the Ember member detail all key values by `member.uuid`. This was a bug fix landed with Part B (surfaces had been keying by `undefined`/hex `id`); see LEARNINGS. Signup keeps its `DEMO_MEMBER_ID` stand-in (no member exists at signup).
- **Long forms + smooth entrance:** the card is capped to the viewport (`max-height` from `window.innerHeight`, fields scroll, header/buttons pinned), a CSS slide-up keyframe animates the card inside the fixed iframe (popup-style), and a `ResizeObserver` on the card sizes the iframe only when content changes (no polling jank). The card is bottom-anchored so frame resizes never make it jump.

## Done = demoable

Owner enables the Landing form and picks fields → a logged-in member missing those fields sees a soft card on landing → fills and saves (persisted, and visible in member detail and on the account page) or dismisses it (not shown again). Works regardless of signup source.

## Out of scope (POC)

Real email sending / actual post-verify timing; a blocking/forced gate (v2); beehiiv-style per-question titles and question types; analytics (completion/dismissal rates).
