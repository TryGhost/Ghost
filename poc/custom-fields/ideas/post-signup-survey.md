# Idea / future task: post-signup survey (progressive profiling)

**Status:** ✅ **Built** as the Landing form — **[Story 5](../stories/05-landing-form.md)** + **[Story 5.5](../stories/05.5-audience-targeted-landing-forms.md)** (done). This doc is the *original thinking*; the stories are canonical and the shipped build diverged from this sketch (see "As built" below).

## As built (how it diverged from this sketch)

- **Named "Landing form", surface key is `landing`** — not `post_signup`. And the surfaces are `signup` + `landing`; there's no separate `account` surface (the account page reuses the signup list).
- **5.5 made it a *list* of per-audience forms** (`landingForms` collection), not a single `forms.post_signup` key. Audience targeting (tier/label, NQL-style) decides who sees which form.
- **Per-member state = a `dismissed` flag** (the "don't nag" record this doc predicted), keyed per form.
- **Kept simple:** field label = the prompt (no per-question titles), placeholder lives on the *definition* (not per-placement), required-at-collection but storage stays nullable.
- **Lives in Membership settings** (next to Custom fields), not under Growth as this doc speculated. Analytics (completion/dismissal rates) and a forced/blocking gate remain deferred — see [landing-form-presentation.md](./landing-form-presentation.md).

## The idea

Collecting custom fields at signup adds friction and hurts conversion. Instead, let owners collect *optional* data **after** the member has already converted (verified email), via a small survey/card dynamically injected when the member lands on the site post-verification.

It is not a new data primitive: it reuses **custom fields** as a new **collection surface** (`post_signup`), alongside `signup` and `account`. This is exactly the placement model the POC already uses (define fields once, opt them into surfaces).

## Why

- Keep the signup form short (max conversion), defer the "nice to have" fields.
- Catch the member at a high-intent moment (just verified, actively on the site).
- Reuses everything: field definitions, placements (`required` / `placeholder` / `order`), values store.

## How it would work

1. **Configure** (admin): owner builds a short survey = a set of custom-field placements on the `post_signup` surface, plus copy (title/intro) and trigger rules.
2. **Per-member state**: track completion so we don't nag. States: `not_started` → `completed` | `dismissed` (maybe `snoozed`/remind-later). Persisted per member.
3. **Trigger**: right after email verification / first authenticated landing.
4. **Injection**: Portal is the natural host. It already loads site-wide and knows the logged-in member, so it can inject a card/modal on whatever page the member lands on. No theme changes needed.
5. **Submit**: writes to the same per-member values store; marks state `completed`.

## Data model fit

- Add `post_signup` as a third key in `forms` (same placement shape).
- Add a per-member survey-state record (completed/dismissed/snoozed + timestamp). This is genuinely new vs. the current model, the only net-new piece.
- Optional: survey-level config (title, intro, trigger conditions, single vs multi-step).

## Where it lives in admin IA

- **Field definitions** stay in **Membership → Custom fields** (the data primitive).
- **The survey itself** fits better under **Growth** (next to Recommendations / Signup forms / Offers), since it is an onboarding/engagement lever, not a static membership setting. Conceptually it is "post sign-up", distinct from the Portal account/signup config.

## Open questions

- Don't-annoy rules: dismissal must persist; cap re-prompts; respect snooze.
- Injection mechanics: Portal card vs modal; which pages; timing after verify.
- One survey vs many; ordering; required-at-collection semantics (still nullable at storage).
- Analytics: completion/dismissal rates (a real reason this belongs under Growth).
- Interaction with the account page: same fields, different timing, avoid double-asking once completed.

## Relationship to the POC

If we pursue this, it slots in after the core loop (Stories 1–4) as a new surface. The POC's placement-based design means it is mostly additive: new surface key + a member completion-state record + the Portal injection UX.
