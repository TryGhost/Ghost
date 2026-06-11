# Member custom fields — overview

A one-page intro: what we're proposing, why it matters, and how it works. For depth see [ROADMAP.md](./ROADMAP.md), [data-model.md](./data-model.md), [LEARNINGS.md](./LEARNINGS.md), and [CHALLENGES.md](./CHALLENGES.md).

## What

Let site owners define their own fields on members, beyond the built-in name and email. Each field has a name and a type (text, number, true/false, list/select). The core idea is **define once, collect anywhere**:

- **Define** a field once in Membership settings.
- **Collect** it on any surface. The POC starts with the **signup form** (and the member's **account page**, connected to it). The **post-signup survey** is the next planned collection surface, prompt members *after* signup so the signup form stays short (see [ideas/post-signup-survey.md](./ideas/post-signup-survey.md)).
- **View and edit** each member's values on the member detail screen in admin.

Collection surfaces are an open set: the model is built so a new place to collect is *additive*, define the field once, then choose where it's collected. So a publisher can ask members for things like company, role, or interests, wherever fits, and use that data later.

(This repo is a UI-only POC: data lives in the browser, no backend. It proves the experience; a real build is database-backed.)

## Why

- **Publishers want to know their audience beyond name + email.** Company, role, location, interests, lead qualification, all common asks that Ghost can't capture today.
- **The current workarounds are poor.** Owners stretch labels (not structured, not member-editable) or bolt on external tools and lose the data from Ghost.
- **It unlocks the things publishers actually want next:** segmenting members by attribute, personalizing emails (merge tags), tailoring content, and understanding who's subscribing, all of which need structured per-member data.
- **It's a recurring, competitive ask** (beehiiv and similar offer it). Owning member data in Ghost keeps it usable across the product (segments, emails, automations) instead of in a silo.

## How

**The model** (the key idea): three layers, not one.
- **Definition** — the field's identity + type.
- **Placement** — the field added to a surface, with per-surface settings (required, order).
- **Value** — a member's answer.

This separation is what lets the same field be required at signup but optional elsewhere, present on one surface and not another, without contradiction.

**The flow** (built end to end in the POC):
1. Owner defines a field in **Membership settings**.
2. It appears in the signup **Form fields** list (built-in Email/Name + custom fields, reorderable). New members fill it at **signup**.
3. The value shows on the **member detail** in admin (read-only rows + an edit modal), editable as part of the normal Save flow.
4. The member can self-edit it on the **account page** (which mirrors the signup form, one connected Portal field list).

Next planned surface: a **post-signup survey** (collect after signup, injected as a card/prompt) so owners can gather optional data without adding signup friction. Because surfaces are additive, it's a new placement target, not a redesign.

**The approach:** reuse existing components on every surface (no new design system), roll out types in tiers (trivial text/number/boolean first, then the more complex select), and keep screens minimalist (read-only + edit modal rather than always-rendered inputs).

**For a real build:** the data moves to the database (queryable, so it can power segments and CSV/import), and the feature threads through the wider surface area, import, CSV export, Admin API, webhooks, email personalization, themes, GDPR. The hard parts and trade-offs are laid out in [CHALLENGES.md](./CHALLENGES.md) and [LEARNINGS.md](./LEARNINGS.md).
