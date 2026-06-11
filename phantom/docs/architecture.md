# Ghost v10 Architecture (Single-Tenant + Central Services)

## Scope and intent
Ghost v10 is a ground-up rewrite intended as a real production replacement
for current Ghost: a single-tenant system with centralized services for
billing, marketplace, and network discovery. The goal is to keep self-hosted
and managed deployments functionally aligned while using central services as
opt-in capabilities rather than structural dependencies. Breaking changes
from current Ghost are acceptable; a forward migration path is mandatory.

Key shifts from current Ghost:
- Single-tenant by default; no tenant_id migration.
- Stateless runtime target (edge-ready) with horizontal scaling;
  Workers-first target with Node verified in CI.
- libSQL-family (libSQL/Turso/D1) as the only supported database, per-site.
- Centralized services for Billing, Marketplace Registry, Explore.
- Partner access via a centralized Partner Portal with scoped grants.
- A built-in automation workflow engine on the work orchestration primitives.
- Existing admin and public apps run unmodified via API compat facades.
- Handlebars theme compat plus a first-class Astro headless path.

## Current-state anchors (from `phantom/src`)
The current v10 implementation is a Hono application with native module
routers mounted under `/ghost/api` and a frontend theme router mounted at `/`.
Key properties:

- Database access uses Drizzle over `@libsql/client`; the exported v10 schema
  lives in `phantom/src/db/schema/index.ts`.
- Module code lives under `phantom/src/modules/<name>/` with local
  `db.ts`, `repo.ts`, `service.ts`, `contracts.ts`, and `routes.ts` files.
  `model.ts` exists only where currently needed (`site` and `identity`).
- Native routes use Zod schemas through `@hono/zod-openapi`. Staff-protected
  routes accept Bearer StaffSession tokens, and webhook management routes use
  Bearer integration tokens.
- Background work currently has `job_definitions`, `job_runs`, and
  `job_idempotency` tables plus an in-memory queue provider. BullMQ,
  Cloudflare Queues, and a worker process are target work, not current code.
- Webhook dispatch currently creates `outbox_messages`; operation-side outbox
  processing updates/deletes local records but does not perform HTTP delivery.
- Metrics use the custom Prometheus-format client in
  `phantom/src/platform/metrics/client.ts` and are exposed at
  `/ghost/api/metrics` only when enabled.
- The frontend router renders fs/R2 theme bundles with a basic route matcher
  for `/`, `/page/{n}/`, and `/{slug}/`; full `routes.yaml` semantics and
  helper parity remain target work.

Legacy/current Ghost table names below are migration inputs, not current v10
table names.
<!-- UNVERIFIED: Legacy Ghost table names are migration inputs and were not re-verified from phantom/src, which only contains the v10 schema. -->

## Vision: "Shopify for independent publishers"
Ghost becomes a publisher platform with:

- Single-tenant installations that scale horizontally via stateless services.
- A centralized marketplace for apps, themes, and services.
- Optional centralized billing for paid marketplace assets.
- A partner portal for agencies and delegated access.
- Network discovery handled via Explore (external service).

## Architectural principles
- Single-tenant core: local data ownership is primary.
- Central services are optional but enabling for paid ecosystem features.
- Stateless-first: app runtime should be horizontally scalable and edge-ready.
- Explicit boundaries: central services interact via APIs and signed tokens.
- Migration-first: minimize schema churn; favor additive capabilities.
- Planned divergence is acceptable when the importer converts the affected
  legacy tables, proven by fixture-based tests.

## Bounded contexts (v10 target)

### 1) Site & Installation (local)
Purpose: site profile, theme selection, navigation, redirects, settings.
Legacy Ghost input: `settings`, `custom_theme_settings`, `redirects`.

### 2) Identity & Access (local + central)
Purpose: local staff accounts; partner access via centralized portal.
Legacy Ghost input: `users`, `roles`, `permissions`, `invites`, `sessions`,
`api_keys`.

### 3) Content & Publishing (local)
Purpose: posts/pages, revisions, tags, collections, routing metadata.
Legacy Ghost input: `posts`, `posts_meta`, `post_revisions`, `tags`, `posts_tags`,
`posts_authors`, `collections`, `snippets`.

### 4) Audience (Members + Auth) (local)
Purpose: member identity, segmentation, consent, newsletter preferences, and
magic-link authentication.
Legacy Ghost input: `members`, `members_labels`, `labels`, `members_newsletters`,
`members_created_events`, `members_login_events`, auth middleware, and spam
prevention.

### 5) Member Subscriptions & Payments (local)
Purpose: subscriptions and payments for members of a Site.
Legacy Ghost input: `products`, `stripe_products`, `stripe_prices`,
`subscriptions`, `members_stripe_customers`, `members_stripe_customers_subscriptions`,
`offers`, `offer_redemptions`, `donation_payment_events`, `benefits`,
`products_benefits`, `members_products`.

### 6) Communication (local)
Purpose: newsletter definitions, issues, deliveries, suppression.
Legacy Ghost input: `newsletters`, `emails`, `email_batches`,
`email_recipients`, `email_recipient_failures`, `suppressions`.

### 7) Engagement & Community (local + external)
Purpose: comments, reactions; recommendations via Explore.
Legacy Ghost input: `comments`, `comment_likes`, `comment_reports`,
`recommendations`, `mentions`.

### 8) Analytics & Attribution (local + central)
Purpose: unified engagement and revenue analytics, event pipeline, link tracking.
Legacy Ghost input: `members_*_events`, `members_click_events`, `actions`,
`milestones`, `links`.

### 9) Extensions (local + central registry)
Purpose: local install state and runtime integration hooks with central registry
references.
Legacy Ghost input: partial via `integrations`, `webhooks`, `outbox`.

### 10) Custom Data & Schema (local)
Purpose: metafields, custom objects, schema registry.
Legacy Ghost input: no direct mapping; today’s custom data lives in
`settings` JSON and ad-hoc JSON columns.

### 11) Site Billing & Eligibility (central + local cache)
Purpose: opt-in billing and paid marketplace eligibility.
Legacy Ghost input: none (new).

### 12) Partner Access (central + local mirror)
Purpose: partner portal identities and access grants for delegated management.
Legacy Ghost input: none (new).

### 13) Media & Storage (local)
Purpose: asset storage, CDN configuration, and file uploads.
Legacy Ghost input: files storage adapters and asset URL handling.

### 14) Activity Feed & Notifications (local)
Purpose: activity feed events with notification views derived from them.
Legacy Ghost input: `notifications`, `members_*_events`, `actions`.

### 15) Work Orchestration & Events (local)
Purpose: background jobs, queues, outbox dispatch, import/export, indexing.
Legacy Ghost input: `jobs`, `outbox`, import/export services, scheduled tasks.

### 16) Automation & Workflows (local)
Purpose: event-triggered automation (drip sequences, onboarding) with steps
executed as jobs; workflows decide what and why, jobs execute.
Legacy Ghost input: `automated_emails` (superseded) and the upstream workflow
engine direction.

## Central services boundary
Central services are separate systems with explicit contracts. Until the
real services exist, flows depending on them are verified against simple
standalone mock services exposing the same surfaces remotely (real HTTP,
real signed tokens/keys) — not in-process stubs.

- Billing Service
  - Owns BillingProfile and paid marketplace entitlements.
  - Integrates with Stripe for payment processing.
  - Member content entitlements remain local to subscriptions.
- Marketplace Registry
  - Owns listings, package signing, compatibility metadata.
  - Validates BillingProfile eligibility at install/upgrade time.
- Partner Portal
  - Owns PartnerOrg identities and staff membership.
  - Issues scoped access tokens and manages AccessGrants.
- Explore
  - Owns network graph, recommendations, and discovery feeds.
  - Knows about both managed and self-hosted Sites.
- ActivityPub Service (external)
  - Out of scope for v10 core but integrates with Site via APIs.

## Identity management resolution
This is the backbone of the distributed model:

1) Local StaffAccount is authoritative for all local operations.
2) Partner staff authenticate only with the Partner Portal.
3) Partner Portal issues scoped tokens tied to an AccessGrant.
4) Sites validate tokens and map to local roles for delegated operations.
5) Partner staff are represented as local StaffAccounts that are externally
   managed and linked to Partner Portal subject ids.
6) All partner actions are auditable locally with grant and staff identity.

This avoids duplicating partner users in local databases while preserving
least-privilege access and clear audit trails.

Staff auth supports invitations, sessions, 2FA/device verification, reset tokens,
and optional SSO adapters. These are local concerns tied to StaffAccount and do
not require central services.

## Authentication flows

### Staff (local)
1) Staff signs in with email/password or SSO adapter.
2) If 2FA/device verification is enabled, AuthFactor challenge is required.
3) StaffSession is issued and scoped to local roles/permissions.
4) Reset flows use ResetToken and invalidate prior sessions.

### Members (local)
1) Member enters email to request magic link.
2) SignupPolicy + AbuseGuard validate access and rate limits.
3) MemberAuthToken is issued and redeemed to create session or access token.
4) Member status and subscription gates drive content access.

### Partners (central + local)
1) Partner staff authenticate via Partner Portal.
2) Partner Portal issues scoped token tied to AccessGrant.
3) Site validates token and maps to externally managed StaffAccount.
4) Partner actions are audited as StaffSession with grant metadata.

### Extensions (local + central)
1) Install flow uses Marketplace Registry eligibility checks.
2) Local ExtensionInstall persists configuration + registry ids.
3) Runtime access uses scoped API keys or webhooks from local Site.
4) Paid license checks are handled by the extension developer.

## Billing opt-in model
- Sites can run without any central billing relationship.
- Paid marketplace assets require BillingProfile enrollment.
- Marketplace Registry validates BillingProfile at install/upgrade time.
- Runtime license enforcement is delegated to extension developers.
- Free assets require no billing opt-in.

## Partner staff lifecycle
- Provisioned: partner staff mapped to a local StaffAccount on first access.
- Active: access grant is valid and role mapping is enabled.
- Suspended: local access disabled without deleting the StaffAccount.
- Revoked: access grant expired or removed; local account is retained for audit.

## Partner access token claims
Target minimum claims expected in scoped Partner Portal tokens. Current native
`PartnerTokenSchema` exposes `token`, `grantId`, `subject`, `scopes`, and
`expiresAt`; central signed-token claims are still target work.
- sub: partner staff subject id (Partner Portal identity)
- org_id: PartnerOrg id
- grant_id: AccessGrant id
- site_id: SiteIdentity id
- scopes: allowed operations
- exp: expiration time

## Extension runtime surface
Baseline runtime remains webhook + API access, with optional upgrades:

- Install-time validation via Marketplace Registry.
- Capability manifest defines required permissions.
- Local enforcement via scoped API keys and feature flags.
- Extension developers may implement their own license checks.
- Local state is limited to install/config data and cached eligibility.

This supports self-hosted installations without introducing hard dependencies
on central services at runtime.

## Background work model
The current v10 implementation has a jobs module with `job_definitions`,
`job_runs`, `job_idempotency`, named queue policies, and an in-memory queue
provider. Operations endpoints cover update checks, token cleanup, metrics
configuration, and local outbox processing. There is no worker process yet,
and the queue provider is not swappable beyond the in-memory implementation.

Current underutilization areas:
- Email sends create local batch records but no provider worker consumes them.
- Outbox processing deletes or retries local messages but does not deliver
  webhook HTTP requests.
- Operations import/export and migration methods record jobs/runs but do not
  execute full data movement or SQL migration files.

Target evolution:
- Standardize on a single work orchestrator with named queues and priorities.
- Promote all side effects to domain events + outbox entries after commit.
- Make long-running tasks explicit (email batches, analytics fetch, imports).
- Require idempotency keys and at-least-once handlers for every job type.
- Provide backoff, retry, and rate limits per job class.
- Ship three queue provider adapters behind one interface: in-memory
  (dev/tests), BullMQ (Node), and Cloudflare Queues (Workers); the provider
  adapter keeps the core job API stable across deployments.
- A worker consumes jobs for email sends, scheduled publishes, and outbox
  dispatch — request handlers only enqueue.
- Automation workflows (WorkflowDefinition/WorkflowRun/StepRun) sit on top:
  workflows decide what and why, jobs execute.
- Use domain events to drive notifications and activity feed aggregation.

## Stateless runtime target
To support edge and horizontal scale:

- Auth, API, and rendering should be stateless and cache-friendly.
- Background work uses queues/jobs with idempotent handlers.
- File storage and media rely on external object storage in managed hosting.
- Self-hosted retains local storage options with compatible adapters.
- Workers-first development is the target: workerd/wrangler is the primary
  dev runtime and Node is the secondary target, verified in CI. The server
  runs on Workers via src/worker.ts + wrangler.jsonc: static files resolve
  through the FileStore adapter (Node fs fallback chains vs the wrangler
  assets binding staged by `yarn worker:assets`), precompiled theme bundles
  are imported statically into the worker bundle (no runtime eval), and the
  lexical renderer injects linkedom on workerd in place of jsdom. Current
  source still has in-memory rate-limit, queue, and mailbox state.
- Stateful concerns (rate limits, storage, queues, env) live behind platform
  adapters with implementations for both runtimes; no in-process state.
- Database is libSQL-family only (libSQL/Turso/D1), one per site. Storage
  adapter switching is an operator contract: adapters share one stable path
  scheme and the operator moves files; no per-asset backend tracking.

## Admin and public app strategy
- Existing apps (Ember admin, React admin apps, portal, comments-ui,
  signup-form, sodo-search) run unmodified against compatibility facades:
  Admin, Content, and Members API surfaces matching current Ghost.
- The native v10 API evolves independently beneath the facades; facades are
  mapping layers over module services, consistent with the domain/API
  decoupling rule.
- Current `phantom/src` routes are native module APIs, not the compatibility
  facades. UI requirements are to be verified by browser e2e tests running the
  existing apps against v10.

## Theme rendering
Two first-class paths:

- Compat: gscan-valid Handlebars themes render unmodified; v10 reimplements
  the theme helper surface and routes.yaml semantics. Current source has a
  basic fs/R2 theme bundle renderer and helper subset, with no full
  `routes.yaml` implementation yet.
- Headless: the Content API is a complete public surface; Astro is the
  official modern front-end story.

## Migration and rollout phases (current Ghost -> v10)
Data migration is import-based (see the operations PRD); these phases
sequence capability rollout.

### Phase 0: Data contracts + opt-in hooks
- Lock canonical export formats for content, members, subscriptions, email.
- Add a SiteIdentity service and installation token for central services.
- Implement an optional BillingProfile link (no behavior changes yet).

### Phase 1: Partner Portal integration
- Create AccessGrant model and local mirror for partner scopes.
- Add Partner Portal token validation in admin auth pipeline.
- Provide audit logging for partner actions.

### Phase 2: Marketplace registry integration
- Wrap current integrations as listings in the central registry.
- Support install/upgrade workflows with eligibility checks.
- Keep runtime enforcement local.

### Phase 3: Metafields and schema registry
- Introduce metafield_definitions and metafield_values.
- Migrate structured settings into metafields where safe.

### Phase 4: Custom objects
- Introduce custom_object_types and custom_object_records.
- Add admin UI and APIs for CRUD with access control.

### Phase 5: Event unification
- Consolidate domain events into a single event model with typed payloads.
- Continue using outbox as dispatch mechanism during transition.

### Phase 6: Work orchestration uplift
- Define job classes and queues for email, analytics, imports, and webhooks.
- Move remaining inline work into queued jobs with idempotent handlers.
- Replace multiple job managers with a single scheduler and worker pool.

## Success criteria
- Managed and self-hosted sites share the same core runtime and APIs.
- The same build runs on Node and Cloudflare Workers.
- Existing Handlebars themes and admin/public apps work against v10 via the
  compat surfaces.
- Paid marketplace assets require opt-in billing but do not gate free usage.
- Partner access works across hosting models without duplicating identities.
- Central services remain optional for free and local-first workflows.
