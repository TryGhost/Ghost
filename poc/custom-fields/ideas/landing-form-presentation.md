# Idea / future task: landing form presentation + enforcement

**Status:** Backlog. Not in the POC. Capture for later. Came up while building Story 5 Part B (the member-facing Landing card).

The POC ships one fixed presentation (a soft, dismissible card pinned bottom-right) and one fixed behaviour (always skippable). Two owner-facing options worth exploring once the core loop proves out.

## 1. Appearance: card vs modal

Let the owner choose how the Landing form is presented:

- **Card** (current POC): a soft, corner-anchored card that slides up over the page. Non-intrusive, easy to ignore.
- **Modal** (new): a centered popup with a backdrop, the *same* presentation as Portal's account/signup popup (`gh-portal-popup`). Higher attention, more deliberate.

Both already exist in Portal as rendering patterns: the card is the Story 5 component; the modal is `PopupModal` + `frame.styles` (`@keyframes popup`, full-screen frame with backdrop). The custom-field rendering (`CustomFieldInput`) and the save/dismiss logic are presentation-agnostic, so this is mostly a wrapper choice, render the same fields inside either shell.

Surface it in the admin Landing form modal (the **General** tab, next to the field list) as an appearance toggle. Mirrors how other Ghost features let you pick a display style.

## 2. Enforcement: skippable vs required

Let the owner decide whether the prompt is dismissable:

- **Skippable** (current POC): "Not now" + close, sets the per-member `dismissed` flag, never blocks. Soft nudge.
- **Required / blocking**: no dismiss affordance; the member must complete the placed fields to proceed (a gate). This is the "forced gate" called out as a v2 path in [../stories/05-landing-form.md](../stories/05-landing-form.md) "Out of scope".

Interacts with appearance: a *required* form probably wants the *modal* presentation (backdrop, centered, can't click away), while *skippable* fits the *card*. They're independent settings, but the defaults could be paired.

Open questions for a real build:
- A hard gate blocks the whole site for that member, needs an escape hatch (sign out, support link) and careful UX, or it traps people.
- Required-ness is per-form, but storage stays nullable (consistent with the rest of the POC: `required` is a collection-time rule, not a storage constraint).
- Pairs naturally with the per-form audience targeting in [audience-targeted landing forms](../stories/05.5-audience-targeted-landing-forms.md) (e.g. require a field only from paid members).

## Not now

Out of scope for the POC. Both are owner-facing config on top of a feature that already works; revisit if the Landing form earns a real build. Related: [post-signup-survey.md](./post-signup-survey.md) (another collection surface), [../stories/05.5-audience-targeted-landing-forms.md](../stories/05.5-audience-targeted-landing-forms.md) (who sees it).
