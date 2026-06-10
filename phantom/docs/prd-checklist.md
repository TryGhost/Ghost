# Ghost v10 PRD Checklist

`[x]` asserts: the PRD's acceptance bullets for the item are implemented AND
at least one colocated test exercises them. Scaffolding (schema + routes
without the behavior) does not qualify. UI-flow items (sections 16-19,
Admin Settings) additionally require browser e2e tests running the existing
apps against phantom.

Binding design rulings live in `decisions.md` — read it before grading or
designing. This checklist reflects the 2026-06-10 source-grounded review
against `phantom/src`.

References (all in this directory):
- `prd.md`
- `prd-operations.md`
- `prd-admin-settings.md`
- `architecture.md` (system) / `module-architecture.md` (module layout)
- `domainmodel.md`
- `decisions.md`

## 1) Staff authentication and access control
- [x] Password-based staff login with rate limiting
- [x] 2FA/device verification flow
- [ ] Staff password reset (service exists; expiry/session-revocation
      acceptance is not fully tested)
- [ ] Staff invitations with role assignment (create/accept tested; expiry
      and error paths untested)
- [ ] Staff sessions with role/permission enforcement (route helper exists;
      forbidden-role behavior untested)
- [ ] Staff API tokens vs integration tokens (creation/revocation tested;
      staff-token request auth and integration-token denial on staff routes
      are not implemented/tested)
- [x] SSO adapters
- [x] Audit trail for staff auth events

## 2) Partner access via Partner Portal
- [x] Access grants with scoped roles and TTL
- [ ] Partner Portal token validation (local opaque tokens only; no remote
      signed-token validation/mock service)
- [ ] External staff mapping to local StaffAccount (implemented; external
      management fields untested)
- [ ] Access grant enforcement per request (validation endpoint exists; not
      wired into every privileged request)
- [ ] Partner audit logging (implemented on validation; audit persistence
      untested)

## 3) Member authentication and signup policy
- [x] Magic-link login tokens
- [ ] SignupPolicy enforcement (non-open policies collapse to one
      `signup_not_allowed` path; policy-specific errors unimplemented)
- [ ] AbuseGuard rate limits (limiter exists; no colocated member test)
- [x] Member auth events persisted
- [x] Session verification for gated content

## 4) Member subscriptions and payments
- [x] Plans/tiers with pricing and benefits
- [ ] Offers/discounts with redemption (service code exists; redemption path
      untested)
- [x] CheckoutSession creation
- [x] Prevent duplicate checkout for active subs
- [ ] BillingAccount maintenance (service code exists; not asserted in tests)
- [ ] ContentEntitlements (service code exists; not asserted in tests)
- [ ] Subscription lifecycle events (local event row created; no outbox and
      event persistence untested)

## 5) Content authoring and publishing
- [x] Posts/pages with Lexical content + revisions
- [ ] Tags, collections, author profiles (collection filters never evaluated)
- [ ] Draft/scheduled/published states (nothing publishes scheduled posts)
- [ ] Domain events for content lifecycle (stored, but no outbox dispatch)
- [ ] URL routing + cache invalidation (no cache invalidation exists)

## 6) Newsletters and email delivery
- [ ] Newsletters with branding and defaults (basic name/sender create tested;
      branding/default subscription behavior absent)
- [ ] Issues linked to content or standalone (no rendering pipeline exists)
- [ ] Queue-backed email sending (local batch records only; no worker or
      provider)
- [ ] Delivery status tracking (untested)
- [ ] Suppression lists + workflow-driven automated emails (suppression not
      checked at send)
- [ ] Email lifecycle events (untested)

## 7) Activity feed and analytics
- [x] Analytics event store + query (standing in until ActivityEvent feed
      projection is wired)
- [ ] Aggregated event types (service method exists; untested and not feed
      projected)
- [ ] Snapshot pipeline (service method exists; untested and not feed
      projected)
- [ ] Explore attribution integration (no retry, no posts/MRR metadata)

## 8) Link tracking and redirects
- [x] Canonical tracked links
- [x] Bulk link updates with redirects
- [x] Click events + attribution

## 9) Media storage and CDN configuration
- [ ] File uploads with metadata (filename/attachment-ref retention missing)
- [ ] Switchable storage adapters (one adapter; see storage ruling)
- [ ] CDN base URL rewriting (rewrite logic untested)
- [ ] Asset URL integrity in Lexical content (idempotency/external URLs untested)

## 10) Integrations and webhooks
- [ ] Integration tokens + webhooks (integration token guard exists on routes;
      manifest event filtering missing)
- [ ] Webhook ownership enforcement (implemented in service; ownership paths
      untested)
- [ ] Outbox-backed webhook dispatch (no HTTP dispatch ever occurs)
- [ ] Webhook retry/backoff (not per-webhook; retry test stubbed)

## 11) Marketplace and extensions
- [ ] Registry listing discovery (hardcoded local data; see central services ruling)
- [ ] Paid listing eligibility checks (needs remote mock registry + tests)
- [ ] Local extension install state (no version tracking or enabled lifecycle)
- [ ] Scoped API/webhook permissions (manifest stored, never enforced)
- [ ] Runtime license checks (extension-owned) (no cached-eligibility fallback)

## 12) Site billing opt-in
- [ ] BillingProfile enrollment (no SiteIdentity token verification)
- [ ] Central billing link without core impact (untested)
- [ ] Cached MarketplaceEntitlements (expiry exists but is never invoked)

## 13) Settings and configuration
- [ ] Typed settings (service exists; module has zero colocated tests)
- [ ] Metafield migration support (service exists; rollback path untested)
- [ ] Custom objects CRUD (service exists; no indexed field queries; JSON blob
      only and untested)

## 14) Notifications
- [ ] Admin notifications CRUD (role enforcement untested)
- [ ] System notifications from events/jobs (no event/job integration exists)

## 15) Work orchestration and jobs
- [ ] Queue provider adapters (in-memory only; ruling requires all three)
- [ ] Named queues with retry/backoff (policies hardcoded, untested)
- [ ] JobDefinition/JobRun (untested)
- [ ] Async offload for heavy work (no worker consumes the queue)
- [ ] Idempotency keys (dedup behavior untested)
- [ ] Operational visibility APIs (`/ghost/api/metrics` exists when enabled;
      job/metrics visibility is untested)

## 16) Public experience: portal, signup, comments
- [ ] Portal modal flows
- [ ] Member signup end-to-end
- [ ] Signup attribution capture
- [ ] Comment access gating
- [ ] Comment sorting, replies, pagination
- [ ] Comment author controls

## 17) Admin content workflows
- [ ] Posts app loads and refreshes
- [ ] Custom views CRUD
- [ ] Post preview/settings
- [ ] Tag management
- [ ] Member management
- [ ] Comment moderation

## 18) Admin navigation, billing UI, release updates
- [ ] Sidebar navigation behavior
- [ ] Force upgrade mode gating
- [ ] Upgrade banner routing
- [ ] What's New release updates

## 19) Admin analytics UI and stats
- [ ] Analytics overview cards
- [ ] Web traffic filters
- [ ] Growth/newsletter analytics empty states
- [ ] Stats app error handling

## 20) Automation workflows
- [ ] Workflow definitions triggered by domain events
- [ ] Workflow runs execute on the job primitives
- [ ] Seeded welcome drip workflow

## 21) Theme rendering and public site
- [ ] Handlebars theme compat rendering (basic fs bundle render tested; helper
      surface parity and routes.yaml absent)
- [ ] Headless Content API completeness + Astro path

## 22) API compatibility facades
- [ ] Admin API facade (Ember admin runs unmodified)
- [ ] Content/Members API facades (portal, comments, signup, search run
      unmodified)

## Operations PRD
### Data export/import
- [ ] Exporter table set output (service returns a static table set; no tests
      or file payload)
- [ ] Import legacy formats (v5 exports — wrapped `{db:[{meta,data}]}` and bare
      `{data}` — import end-to-end with fixture-backed tests; v1/v2 formats
      untested)
- [ ] Legacy field mapping (mobiledoc/html-only posts → lexical html card,
      ISO→epoch timestamps, settings key remapping, emails→issues,
      products→plans/prices all tested; amp/comment_id mapping absent)
- [x] Fixture-based importer test per restructured table (posts, tags,
      posts_tags, posts_authors, users→author_profiles+staff, roles,
      newsletters, emails→issues, members_newsletters→memberships,
      products→plans/prices, settings, custom_theme_settings proven from a
      real v5 export in `src/modules/operations/importer.test.ts`;
      posts_meta/offers/snippets not yet restructured)

### Migrations and schema utilities
- [ ] Rollback and re-apply migrations (run records only; no SQL migration
      execution)
- [ ] Idempotent migrations (run records are idempotent; SQL behavior absent)
- [ ] Default fixtures (service seeds basics; untested)
- [ ] Nullable migration utilities (records requested changes; no SQL
      nullability change)

### Settings integrity
- [ ] Core settings allowlist
- [ ] Non-core settings migration requirements

### URL service
- [ ] URL generator uses routing rules (simple `/posts`, `/tag`, `/author`
      paths only)
- [ ] Tags/authors with no public content (implemented via `hasContent`;
      untested)
- [ ] Subdirectory URL support (implemented; untested)

### Email analytics events and suppression
- [ ] Mailgun event handling (service exists; no operations tests)
- [ ] Complaint event suppression (service exists; no operations tests)
- [ ] Unsubscribe event handling (service exists; no operations tests)
- [ ] Ignore invalid events (service exists; no operations tests)
- [ ] Suppression list updates (service exists; no operations tests)

### Member welcome workflows and outbox
- [ ] MemberCreatedEvent outbox entries trigger signup workflows (no workflow
      engine/outbox integration)
- [ ] Imported/admin-created members do not trigger workflows (welcome queue
      method checks source; untested)
- [ ] Workflow step template validation (welcome template check exists;
      workflow runs absent)

### Email sending and batching
- [ ] Batch sending and unique recipients
- [ ] Paid/free segmentation
- [ ] Batch sizing
- [ ] Retry logic
- [ ] Link tracking and outbound tagging
- [ ] Comment CTA blocks
- [ ] Replacement token resolution

### Managed email domain warming
- [ ] Warmup limits ramp
- [ ] Same-day send rules
- [ ] Fallback domain caps

### Email address resolution
- [ ] Sender/reply-to rules
- [ ] Support address rules
- [ ] Newsletter sender name defaults

### Jobs and maintenance
- [ ] Outbox processing (local delete/retry only; no HTTP delivery and
      untested)
- [ ] Update-check job (method calls configured endpoint; no scheduler/test)
- [ ] Token cleanup job (method calls repository cleanup hooks; no
      scheduler/test)

### Metrics
- [ ] Prometheus-format metrics exposure (client and route exist; untested)

## Admin Settings PRD
- [ ] Layout, routing, permissions
- [ ] Site profile and branding
- [ ] Membership access controls
- [ ] Portal configuration
- [ ] Tiers and Stripe
- [ ] Offers
- [ ] Recommendations
- [ ] Membership analytics settings
- [ ] Email settings
- [ ] Advanced and integrations
