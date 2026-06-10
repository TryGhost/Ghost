# Ghost v10 PRD (Single-Tenant + Central Services)

## Purpose
Ghost v10: a single-tenant, ground-up rewrite intended as a real production
replacement for current Ghost, leveraging centralized services for billing,
marketplace registry, partner access, and Explore. Breaking changes from
current Ghost are acceptable; a forward migration path from current-day
Ghost is mandatory.

## Scope
- Covers core Ghost runtime, APIs, and platform integrations described in
  `architecture.md` and `domainmodel.md`.
- Implementation status is grounded against `phantom/src`, especially module
  contracts, routes, services, database schema, and colocated tests. Legacy
  Ghost test suites remain reference inputs for compatibility work, but they
  are not evidence that a v10 item is complete.

## Non-goals
- ActivityPub federation internals (handled by external service).
- ActivityPub UI flows and acceptance tests (explicitly out of scope for
  v10 core).
- Mobile app features outside the Admin and Members web flows.
- Legacy Mobiledoc compatibility (content migrated already).

## Key principles
- Single-tenant core with optional centralized services.
- Stateless-first runtime with explicit background work orchestration;
  Workers-first target with Node verified in CI.
- libSQL-family is the only supported database.
- Existing admin and public apps run unmodified via API compat facades.
- Central services interact via APIs and signed tokens; until they exist,
  flows are verified against standalone remote mock services.
- Marketplace listings are owned centrally; local installs store only install state.
- Divergence from current Ghost is acceptable once the importer converts the
  affected legacy tables, proven by fixture-based tests.

## Related PRDs
- `prd-admin-settings.md` (Admin X settings UI flows).
- `prd-operations.md` (data portability, migrations, jobs, email pipeline).

## Sequences and requirements

### 1) Staff authentication and access control
Domain/Architecture: Identity & Access, Partner Access, Work Orchestration.
- [ ] Support password-based staff login with rate limiting and brute-force protection.
  - Brute-force attempts return 429 after configured retries.
  - Successful login yields a valid StaffSession token usable as a Bearer
    token for `/ghost/api/staff/me` and other protected native routes.
  - Failed login attempts are tracked per user and IP.
- [ ] Support 2FA/device verification for staff logins and sensitive actions.
  - 2FA/device verification is enforced when enabled and bypassable only with verified token.
  - Resent verification tokens invalidate older verification attempts.
  - New device logins require verification when device checks are enabled.
- [ ] Support staff password reset via time-bounded ResetToken.
  - Reset tokens expire and invalidate prior sessions on use.
  - Reset flow returns a verification token usable for 2FA bypass on next login.
  - Reset token requests without required fields return 400.
- [ ] Support staff invitations with role assignment and expiration.
  - Expired invites cannot be redeemed and return a clear error.
  - Invited role is applied on acceptance and visible in staff list.
  - Accepting an invite creates a StaffAccount with the assigned role.
- [ ] Issue StaffSession tokens and enforce role/permission checks at API layer.
  - Role checks deny forbidden endpoints with 403.
  - Session tokens are invalidated on password reset.
  - Logout invalidates the active session token.
- [ ] Support staff API tokens distinct from integration tokens.
  - Staff tokens honor role permissions and are revocable.
  - Integration tokens have no user identity and cannot access
    `/ghost/api/staff/me`.
  - Staff tokens can be rotated without breaking other sessions.
- [ ] Support SSO adapters for staff login with configurable mapping rules.
  - SSO login yields a valid StaffSession and respects 2FA policy.
  - SSO adapter can map external identity to an existing StaffAccount.
  - Misconfigured SSO adapters return 401 with a clear error.
- [ ] Provide audit trail entries for staff auth events (login, logout, reset, 2FA).
  - Audit entries include actor, action, timestamp, and outcome.
  - Audit entries include origin metadata (IP or device id when available).
  - Audit entries are queryable by actor and time range.

### 2) Partner access via Partner Portal
Domain/Architecture: Partner Access, Identity & Access.
- [ ] Allow Site admins to grant partner access with scoped roles and TTL.
  - Grants specify resource scopes and expiration timestamps.
  - Grants can be revoked immediately by Site admins.
  - Partner access changes appear in admin activity feeds.
  - Grant scopes include resource boundaries (posts, members, settings).
- [ ] Allow Partner Portal to issue scoped access tokens tied to AccessGrant.
  - Tokens include grant id, org id, and site id claims.
  - Tokens expire and require re-issuance via the Partner Portal.
  - Tokens are rejected if requested action exceeds grant scope.
  - Tokens are validated against Partner Portal signing keys.
- [ ] Auto-provision or map external Partner staff to local StaffAccount entries.
  - External staff entries are marked as externally managed and non-editable locally.
  - Partner staff cannot reset passwords locally.
  - Partner staff retain a stable identity across multiple sites.
  - Local entries store the external subject id for auditability.
- [ ] Enforce AccessGrant scope and expiry at every privileged request.
  - Expired grants return 403 and do not create sessions.
  - Scope violations return 403 with a partner-specific error code.
  - Existing sessions are invalidated when a grant is revoked.
  - Grant expiry is checked on every privileged request.
- [ ] Record all partner actions in local audit log with grant metadata.
  - Audit records include partner org and staff subject ids.
  - Audit records include grant id and scope used for the action.
  - Audit records include token issuance time when available.
  - Audit records include IP/device metadata when present.

### 3) Member authentication and signup policy
Domain/Architecture: Audience (Members + Auth).
- [ ] Support magic-link login for members with single-use tokens.
  - Magic-link tokens are single-use and expire.
  - Invalid or reused tokens return 400 with a clear error.
  - Magic-link tokens are never returned in API responses.
- [ ] Enforce SignupPolicy (open, invite-only, paid-only, none) for signup flows.
  - Invite-only/paid-only/none policies block signup with proper error messaging.
  - Invite-only blocks signin for unknown emails with a specific error.
  - Paid-only signups return a specific error code prompting checkout.
- [ ] Apply AbuseGuard rate limits to magic-link and signup endpoints.
  - Rapid-fire requests are throttled with 429 responses.
  - Rate limits are reset after successful verification or cooldown.
  - Rate limit headers are returned on throttled responses.
- [ ] Persist member auth events for activity feed and analytics.
  - Auth events appear in activity feed queries.
  - Auth events link to member id and attribution fields.
  - Auth events record login vs signup event types.
- [ ] Support member session verification for gated content access.
  - Unverified sessions cannot access paid content.
  - Verified sessions allow access to tier-gated content.
  - Invalid sessions return 401 or 403 depending on context.

### 4) Member subscriptions and payments
Domain/Architecture: Member Subscriptions & Payments, Audience.
- [ ] Support tiers/plans with pricing and benefits (month/year prices).
  - Invalid prices return 422 with validation errors.
  - Price values are integers and within allowed bounds.
  - Tier responses include price ids for month and year options.
- [ ] Support offers/discounts with validation and redemption tracking.
  - Offer redemption records are created and validated per cadence.
  - Invalid offer codes return 404 or 422 with clear error codes.
  - Expired or inactive offers cannot be redeemed.
- [ ] Create CheckoutSession to initiate provider checkout flows (e.g. Stripe).
  - Checkout session creation returns a provider URL and id.
  - Offer-based checkout sessions include provider-side discounts.
  - Checkout sessions include success and cancel URLs.
- [ ] Prevent checkout when member already has an active paid subscription.
  - Existing paid members receive a 403 with a clear error code.
  - Duplicate checkout attempts are rejected without creating new sessions.
  - Existing subscriptions for the same tier block new checkouts.
- [ ] Maintain BillingAccount for payment provider linkage.
  - BillingAccount is created/updated on successful checkout.
  - BillingAccount changes are idempotent per provider customer id.
  - Provider customer ids are reused across repeat purchases.
- [ ] Generate ContentEntitlements from subscriptions and manual grants.
  - ContentEntitlements update on subscription lifecycle changes.
  - Manual grants persist without provider linkage.
  - Entitlements are removed on subscription cancellation.
  - ContentEntitlements are member-scoped and separate from marketplace entitlements.
- [ ] Emit subscription lifecycle events for analytics and notifications.
  - Create/cancel events are emitted to outbox.
  - Events include member id, subscription id, and tier id.
  - Events include cadence and currency for analytics.

### 5) Content authoring and publishing
Domain/Architecture: Content & Publishing, Site & Installation, Work Orchestration.
- [ ] Support posts/pages with Lexical content and revisions.
  - Content revisions are immutable and auditable.
  - Revisions track editor id and change reason.
  - Lexical payload validation rejects malformed structures.
- [ ] Support tags, collections, and author profiles.
  - API allows browse/read for tags and collections.
  - Tag slug uniqueness is enforced per site.
  - Collection filters are evaluated deterministically.
- [ ] Support draft/scheduled/published states with scheduling logic.
  - Scheduled posts publish within tolerance and emit events.
  - Scheduled posts can be unscheduled and revert email-only flags.
  - Scheduled posts expose future `publishedAt` in native API responses.
- [ ] Emit domain events on publish/update/delete for webhooks and analytics.
  - Outbox records are created for each content lifecycle event.
  - Webhooks receive event payloads with post/page identifiers.
  - Delete events include resource type and id.
- [ ] Maintain URL routing and cache invalidation rules per status change.
  - Cache invalidation is triggered on publish/unpublish.
  - Cache invalidation updates include canonical URL when required.
  - URL changes update configured redirects when enabled.

### 6) Newsletters and email delivery
Domain/Architecture: Communication, Work Orchestration, Analytics.
- [ ] Support newsletters with branding and subscription defaults.
  - Newsletter settings persist and apply to new signups.
  - Default newsletter settings apply to member signup and portal flows.
  - Sender identity validation errors return 422.
- [ ] Support issues linked to content or standalone.
  - Issues can be created without a linked post.
  - Issues render live at delivery time from current content; snapshotting
    is a non-goal so conditional/personalized content stays possible.
    Mid-send edits may alter what later batches receive.
  - Issue previews render using the same pipeline as sends.
- [ ] Schedule email batch sending via queue-backed jobs.
  - Issue send enqueues a job and updates status.
  - Batch jobs prevent duplicate concurrent sends for the same issue.
  - Batch jobs obey concurrency limits per provider.
- [ ] Track delivery status and failures per recipient.
  - Failures persist and appear in analytics.
  - Delivery status updates include error codes and timestamps.
  - Recipient failures are retriable where provider supports it.
- [ ] Support suppression lists; automated emails are workflow-driven.
  - Suppressed members are excluded from sends.
  - Drip/automated sequences (welcome, onboarding) are automation workflows
    (see Automation & Workflows context); the welcome series ships as a
    seeded default workflow. Workflow sends respect suppression and member
    status changes.
  - Suppressions can be added manually and via provider events.
- [ ] Emit email lifecycle events for analytics and reporting.
  - Delivered/opened/failed email events are emitted.
  - Email events are linked to issue and member ids.
  - Events include provider metadata for troubleshooting.

### 7) Activity feed and analytics
Domain/Architecture: Analytics & Attribution, Activity Feed & Notifications.
- [ ] Store and query member activity events with filtering/pagination.
  - Events paginate correctly with stable ordering.
  - Filter combinations reject invalid OR clauses with 400.
  - Pagination totals match the number of remaining events.
- [ ] Support aggregated event types (clicks, comments, email engagement).
  - Aggregated events appear in activity feed filters.
  - Aggregated events do not duplicate raw events in feeds.
  - Aggregated click events group by post and time window.
- [ ] Back activity feed with event pipeline + snapshots for performance.
  - Snapshot queries return within defined latency targets.
  - Snapshots align with the latest persisted event timestamp.
  - Snapshot rebuilds are idempotent and resumable.
- [ ] Maintain Explore attribution integration for cross-site discovery.
  - Attribution payloads are sent to Explore.
  - Explore payloads include total posts and MRR stats metadata.
  - Explore sync retries on transient failures.

### 8) Link tracking and redirects
Domain/Architecture: Analytics & Attribution, Site & Installation.
- [ ] Track canonical links with attribution metadata.
  - Tracked links include attribution fields.
  - Attribution includes post id and newsletter context when applicable.
  - Link ids remain stable across edits.
- [ ] Support bulk update of links with redirect rules.
  - Bulk update applies consistent redirect metadata.
  - Bulk updates return per-item success/failure stats.
  - Bulk updates do not affect unrelated links.
- [ ] Capture click events for analytics and conversion attribution.
  - Click events populate attribution fields and reporting.
  - Click events support link and redirect type differentiation.
  - Click events are deduplicated per request id.

### 9) Media storage and CDN configuration
Domain/Architecture: Media & Storage, Site & Installation.
- [ ] Support file uploads with media metadata and storage references.
  - File upload returns stable URL and metadata.
  - Uploads support attachment refs and original filename retention.
  - Unsupported mime types return 415 or 422.
- [ ] Allow switching storage adapters without data loss (operator contract).
  - Adapters implement one stable path scheme; moving stored files between
    backends on switch is the operator's responsibility.
  - An adapter switch does not modify stored asset URLs or file URLs inside
    Lexical content.
  - Adapter switching does not re-write stored originals.
- [ ] Support CDN base URL rewriting for media and file assets.
  - Rendered content uses CDN base URLs when configured.
  - CDN rewrite supports media and files independently.
  - CDN rewrite does not modify external URLs.
- [ ] Maintain asset URL integrity within Lexical content.
  - Lexical content rewrites asset URLs consistently.
  - URL rewriting is idempotent across repeated renders.
  - Non-asset URLs remain unchanged.

### 10) Integrations and webhooks
Domain/Architecture: Extensions, Work Orchestration & Events.
- [ ] Maintain IntegrationToken and webhooks with per-event subscriptions.
  - Webhook creation requires valid integration identity.
  - Integration tokens can browse allowed resources without staff identity.
  - Integration tokens cannot access staff-only endpoints.
- [ ] Enforce webhook ownership by integration identity.
  - Orphaned webhooks are rejected with 422.
  - Webhook edits cannot change integration ownership.
  - Webhook deletes are restricted to the owning integration.
- [ ] Webhook dispatch uses the outbox-backed event pipeline.
  - Outbox entries are created for dispatchable events.
  - Dispatch is idempotent per message id.
- [ ] Provide retry/backoff for webhook delivery failures.
  - Failed deliveries are retried with backoff.
  - Permanent failures are surfaced in logs and status fields.
  - Backoff strategy is configurable per webhook.

### 11) Marketplace and extensions
Domain/Architecture: Extensions (local + central registry), Site Billing & Eligibility.
- [ ] Support marketplace listing discovery via centralized registry.
  - Registry search returns listings with compatibility metadata.
  - Listings include version constraints and capability manifests.
  - Registry search supports category and keyword filters.
- [ ] Enforce paid listing eligibility via BillingProfile + MarketplaceEntitlement.
  - Paid listings require BillingProfile and entitlement.
  - Eligibility is checked on install and on update.
  - Eligibility failures include reason codes.
- [ ] Install extensions locally with minimal state (config + registry ids).
  - Local installs store only registry id + config.
  - Local uninstall clears configuration without touching registry data.
  - Install state includes enabled/disabled status.
- [ ] Provide scoped API access and webhook permissions per capability manifest.
  - Permissions map to capability manifest scopes.
  - Denied scopes return 403 with capability identifiers.
  - Webhooks are filtered to events allowed by the manifest.
- [ ] Allow extension developers to handle runtime license checks.
  - Runtime execution does not depend on central services.
  - Local runtime continues with cached eligibility when registry is unavailable.
  - Runtime can operate in read-only mode when eligibility is unknown.

### 12) Site billing opt-in
Domain/Architecture: Site Billing & Eligibility.
- [ ] Allow a Site to enroll in BillingProfile to enable paid marketplace assets.
  - BillingProfile can be linked/unlinked without data loss.
  - Enrollment stores a SiteIdentity link for later registry checks.
  - Enrollment requires a verified SiteIdentity token.
- [ ] Support linking to centralized billing without affecting core site usage.
  - Core site APIs continue to function without billing.
  - Billing failures do not block core authoring and publishing flows.
  - Billing unlink disables paid marketplace installs immediately.
- [ ] Cache MarketplaceEntitlements locally with TTL and revocation handling.
  - Expired entitlements disable paid installs.
  - Revocation is enforced on next entitlement refresh.
  - Entitlement refresh interval is configurable.
  - MarketplaceEntitlements are site-scoped and distinct from member content entitlements.

### 13) Settings and configuration
Domain/Architecture: Site & Installation, Custom Data & Schema.
- [ ] Support typed settings for site profile, features, and theme config.
  - Settings validation rejects invalid types.
  - Settings changes invalidate relevant caches.
  - Settings updates emit domain events.
- [ ] Maintain structured settings migration into Metafields.
  - Metafield migration preserves existing setting values.
  - Metafield migration is reversible for rollback.
  - Metafield migrations are versioned.
- [ ] Provide custom objects for publisher-defined data models.
  - Custom objects support CRUD with access control.
  - Custom objects validate field types and required constraints.
  - Custom objects support indexed fields for queries.

### 14) Notifications
Domain/Architecture: Activity Feed & Notifications.
- [ ] Support admin notifications create/list/delete with role permissions.
  - Editors can create notifications, authors cannot.
  - Deleting notifications returns 204 and removes from list.
  - Notification reads respect role-based access.
- [ ] Generate system notifications from domain events and background jobs.
  - Notifications are created for key lifecycle events.
  - Notification payloads include resource links when applicable.
  - Background job failures create alert notifications.

### 15) Work orchestration and jobs
Domain/Architecture: Work Orchestration & Events.
- [ ] Use queue provider adapters: in-memory (dev/tests), BullMQ (Node), and
  Cloudflare Queues (Workers) behind one provider interface.
  - Queue provider can be swapped without API changes (proven across all
    three adapters).
  - Queue provider configuration is environment-driven.
  - Provider supports delayed jobs and cron scheduling.
  - A worker consumes jobs (sends, scheduled publishes, outbox dispatch);
    request handlers only enqueue.
- [ ] Support named queues, priorities, retries, and backoff policies.
  - Queue policies are configurable per job class.
  - Job classes include email, analytics, imports, and outbox processing.
  - Priority order determines execution under contention.
- [ ] Define JobDefinition/JobRun for scheduled and ad-hoc work.
  - Job runs record status, timing, and errors.
  - Failed job runs capture error messages and retry counts.
  - Job runs link back to JobDefinition by id.
- [ ] Offload heavy request-time work to jobs (email, analytics, imports, outbox).
  - Long-running tasks execute asynchronously.
  - Request endpoints return quickly after enqueueing work.
  - Enqueue failures return 5xx with retriable error codes.
- [ ] Require idempotency keys for at-least-once delivery.
  - Duplicate deliveries do not create duplicate effects.
  - Idempotency keys are unique per job type and payload.
  - Idempotency keys are stored for a configurable retention window.
- [ ] Support operational visibility: job status, timings, and failure metadata.
  - Operators can query job status and recent failures.
  - Job status APIs return queue depth and worker health.
  - Operational metrics expose queue latency and throughput.

### 16) Public experience: portal, signup, and comments
Domain/Architecture: Audience (Members + Auth), Engagement & Community.
- [ ] Portal opens and switches between signup and sign-in.
  - Subscribe button opens signup with email and submit controls.
  - Sign-in link opens sign-in with email and continue controls.
  - Switching modes updates the form without reload.
- [ ] Member signup via magic link completes end-to-end.
  - Signup emails include a complete-signup prompt.
  - Magic link redemption signs in and shows member account state.
  - Welcome email is sent when enabled.
- [ ] Signup attribution captures source and page context.
  - Attribution stores direct, post, referrer, newsletter, and UTM sources.
  - Member detail view surfaces source and page names.
- [ ] Comment access matches comments setting and membership state.
  - Anonymous visitors see sign-in/sign-up CTAs when comments are enabled.
  - Free members can comment when comments are enabled for all members.
  - Paid-only comments block free members and allow paid members.
  - Comments disabled hides the comment UI entirely.
- [ ] Comment interactions support sorting, replies, and pagination.
  - Sorting supports oldest/newest with consistent counts.
  - Load-more controls fetch additional comments or replies.
  - Replies can target top-level comments or reply threads.
- [ ] Comment author controls are enforced.
  - Authors can edit or delete their own comments.
  - Non-authors cannot edit/delete and only see moderation actions.

### 17) Admin content workflows
Domain/Architecture: Content & Publishing, Audience, Engagement & Community.
- [ ] Posts list refreshes and Admin Posts app loads without errors.
  - New posts appear after refresh.
  - Posts micro-frontend accepts mocked API overrides.
- [ ] Custom views support create, edit, delete, and persistence.
  - Saving filtered views adds sidebar items with color indicators.
  - Duplicate view names show validation errors.
  - Editing views updates name/color and keeps active state.
  - Deleting active views returns to the default posts view.
  - Views and filters persist after reload and reset when re-selected.
- [ ] Post preview and settings behave consistently.
  - Preview modal closes via ESC (header or iframe focus) and close button.
  - Publish date uses ISO date format in settings.
- [ ] Tag management supports list, create, edit, delete, and pagination.
  - Public/internal tags list separately with correct counts.
  - Empty list shows CTA to create tags.
  - Tag delete confirms post counts and returns to list.
  - Tag editor loads by slug; missing tags render 404.
  - Infinite scroll loads additional tags on demand.
- [ ] Member management supports create, edit, delete, export, and impersonation.
  - Invalid email validation blocks create/edit.
  - Label add/remove and newsletter toggles persist.
  - CSV export includes expected fields and filtered exports.
  - Filter actions apply labels to selected members.
  - Impersonation generates a magic link that opens the member portal.
- [ ] Comment moderation supports permalinks and deep linking.
  - View actions open post permalinks when enabled.
  - Deep links filter to a comment and can reset to show all comments.

### 18) Admin navigation, billing UI, and release updates
Domain/Architecture: Site & Installation, Activity Feed & Notifications.
- [ ] Sidebar navigation reflects active state and submenu behavior.
  - Main nav items update active state on click.
  - Posts submenu expands and highlights active filters.
  - User menu exposes profile, sign out, and night shift toggle.
  - Network badge shows unread counts and hides on network routes.
- [ ] Force upgrade mode gates navigation behind the billing iframe.
  - Non-settings routes remain blocked and show billing iframe.
  - Direct navigation to blocked routes shows billing iframe.
  - Settings and sign out remain accessible.
- [ ] Upgrade banner routes to billing plans.
  - Upgrade now navigates to the billing plans route.
- [ ] What's New surfaces release updates.
  - Featured entries show a banner and can be dismissed.
  - Modal lists all entries with images when available.
  - Badge indicators appear for unseen entries and clear on view.

### 19) Admin analytics UI and stats
Domain/Architecture: Analytics & Attribution.
- [ ] Analytics overview surfaces visitor and post summaries.
  - Homepage visits increment unique visitors.
  - Latest post and top posts cards display counts.
  - View more links navigate to web traffic or growth views.
- [ ] Web traffic filters support source filtering and URL persistence.
  - Filter fields show available values with counts.
  - Clicking a source adds a filter and persists in the URL.
  - Removing filters restores baseline data.
- [ ] Growth and newsletters analytics show empty states correctly.
  - Growth top content cards show no-conversion states per tab.
  - Newsletter analytics show empty state messaging when no sends.
  - Subscriber totals calculate percent changes.
- [ ] Stats app surfaces analytics data and handles missing data gracefully.
  - App loads with mocked data and renders header content.
  - Missing mocks show an error state.
  - Web traffic and locations tabs surface top sources and countries.

### 20) Automation workflows
Domain/Architecture: Automation & Workflows, Work Orchestration & Events.
- [ ] Support workflow definitions triggered by domain events.
  - Definitions declare a trigger event type and ordered steps.
  - Step types include send email, wait/delay, and conditional branch.
  - Definitions can be enabled and disabled without deletion.
- [ ] Execute workflow runs on the job primitives.
  - Each step executes as a job with retry/backoff semantics.
  - Wait steps use delayed jobs, not in-process timers.
  - Runs record per-step status, timing, and errors.
- [ ] Ship the welcome series as a seeded default drip workflow.
  - Member-origin signups trigger the workflow; imported and admin-created
    members do not.
  - Email steps respect suppression and member status changes.
  - Missing or inactive step templates leave runs pending with error
    messages.

### 21) Theme rendering and public site
Domain/Architecture: Site & Installation, Content & Publishing.
- [ ] Render gscan-valid Handlebars themes unmodified (compat path).
  - The Ghost theme helper surface is reimplemented to parity.
  - routes.yaml routing semantics are honored, including subdirectories.
  - Theme settings and custom theme settings apply to rendering.
- [ ] Provide a complete headless public surface (modern path).
  - All public content, tags, authors, tiers, and settings are queryable via
    the Content API.
  - Astro is the official modern front-end story with a maintained
    integration.
  - Member-gated content enforces entitlements via the Members API.

### 22) API compatibility facades
Domain/Architecture: all contexts; see `architecture.md` (admin and public
app strategy).
- [ ] Expose an Admin API facade compatible with current Ghost.
  - The existing Ember admin runs unmodified against the facade.
  - Facade endpoints map onto native v10 module services.
  - Native v10 API evolution does not break the facade contract.
- [ ] Expose Content and Members API facades compatible with current Ghost.
  - Portal, comments-ui, signup-form, and sodo-search run unmodified.
  - Facade responses match current Ghost shapes (pagination, errors).

## Implementation checkpoints
- [ ] Validate domain/architecture alignment with this PRD.
- [ ] Identify all current API endpoints and map to v10 aggregates (this
      feeds the compat facades).
- [ ] Define central service API contracts for Billing, Registry, Partner
      Portal — then stand up the remote mock services implementing them.
- [ ] Define event schemas for domain events and outbox delivery.
- [ ] Document migration paths for settings, media URLs, and billing links.
