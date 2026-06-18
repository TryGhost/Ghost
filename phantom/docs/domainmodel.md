# Ghost v10 Domain Model (Single-Tenant + Central Services)

## Scope and intent
Ghost v10 is a ground-up rewrite intended as a real production replacement
for current Ghost. The model keeps the core deployment model single-tenant:
each Ghost instance represents one Site (publisher), with no `tenant_id` on
local tables. Centralized services (Billing, Marketplace Registry, Partner
Portal, Explore, ActivityPub) provide opt-in capabilities and network effects
across both managed and self-hosted sites.

Key goals:
- Single-tenant data model with strong local ownership.
- Optional centralized identity and billing for paid marketplace assets.
- Partner access via a centralized Partner Portal with scoped grants.
- Extensions remain deployable on any hosting model.
- Breaking changes from current Ghost are acceptable; a forward migration
  path is mandatory. A divergence from a legacy table is paid for when the
  importer converts that table from a real Ghost export, proven by a
  fixture-based test. The migration mapping below is the index, not the
  proof.

Sources referenced:
- `phantom/src/db/schema/index.ts`
- `phantom/src/modules/*/{db.ts,contracts.ts,routes.ts,service.ts}`
- `phantom/src/app/app.ts`

The "Legacy Ghost input" lines below identify migration-source tables from
current Ghost, not the current v10 table names in `phantom/src`.
<!-- UNVERIFIED: Legacy Ghost table names are migration inputs and were not re-verified from phantom/src, which only contains the v10 schema. -->

## Ubiquitous language
- Site: a single Ghost publication installation.
- Installation: the running instance of a Site (self-hosted or managed).
- SiteIdentity: central registration record and signing keys for a Site.
- StaffAccount: local admin identity for a Site.
- PartnerOrg: centralized partner entity (agency, network, platform).
- ExternallyManagedStaff: local StaffAccount provisioned via Partner Portal.
- AccessGrant: time-bounded access from a Site to a PartnerOrg.
- Invitation: pending staff access grant with role + expiration.
- StaffSession: authenticated session for staff access.
- AuthFactor: second-factor or verification challenge metadata.
- ResetToken: time-bounded recovery token for staff auth.
- SSOAdapter: identity bridge to external staff auth providers.
- BillingProfile: opt-in billing identity tied to a SiteIdentity.
- MarketplaceListing: centralized listing for apps, themes, integrations.
- ExtensionPackage: signed artifact with declared capabilities.
- ExtensionInstall: local record of an installed package.
- ContentEntitlement: member-scoped access grant to content, derived from Subscription.
- MarketplaceEntitlement: site-scoped access grant to paid assets, derived from BillingProfile.
- WorkflowDefinition: event-triggered automation (steps: send email, wait,
  branch) executed on the job primitives.

## Bounded contexts and aggregates

### Site & Installation (local)
Legacy Ghost input: `settings`, `custom_theme_settings`, `redirects`.

- Site (aggregate root)
  - Branding, site URL, locale, feature flags, operational settings.
- Installation (entity)
  - Runtime metadata (hosting type, version, capabilities).
- Theme (aggregate root)
  - Theme assets, version, routing rules, custom theme settings.
- RedirectRule (entity)
  - From/To path and status; owned by Site.

### Identity & Access (local + central)
Legacy Ghost input: `users`, `roles`, `permissions`, `invites`, `sessions`,
`api_keys`.

- StaffAccount (aggregate root, local)
  - Credentials, profile, status, notification preferences.
  - Can be marked as externally managed with a Partner Portal subject id.
- Role (entity) and Permission (value object, local)
  - Authorization policies; role membership belongs to StaffAccount.
- Invitation (entity, local)
  - Pending staff access grant with role + expiration.
- StaffSession (entity, local)
  - Session metadata, verification state, and revocation.
- AuthFactor (entity, local)
  - Second-factor state (email token, app, device verification).
- ResetToken (entity, local)
  - Password reset or access recovery token metadata.
- SSOAdapter (value object, local)
  - External identity provider configuration and mapping rules.
- StaffApiToken (entity, local)
  - Staff-scoped API token with permissions and revocation state.
- IntegrationToken (entity, local)
  - Integration-scoped API token without user identity.
- PartnerOrg (aggregate root, central)
  - Partner profile, compliance, payout settings.
- AccessGrant (aggregate root, central + local mirror)
  - Delegated access from Site to PartnerOrg.
  - Scope, TTL, and audit metadata.

### Content & Publishing (local)
Legacy Ghost input: `posts`, `posts_meta`, `post_revisions`, `tags`,
`posts_tags`, `posts_authors`, `collections`, `snippets`.

- ContentItem (aggregate root)
  - Types: Post, Page.
  - Body (Lexical), title, slug, visibility, routing metadata.
- ContentRevision (entity)
  - Immutable snapshots with author + change reason.
- Tag (aggregate root)
  - Public or internal, optional parent, SEO metadata.
- Collection (aggregate root)
  - Curated or filter-based list of ContentItems.
- Snippet (aggregate root)
  - Reusable content blocks.
- AuthorProfile (entity)
  - Public author metadata, linked to StaffAccount.

### Audience (Members + Auth) (local)
Legacy Ghost input: `members`, `labels`, `members_labels`, `members_newsletters`,
`members_created_events`, `members_login_events`.

- Member (aggregate root)
  - Email identity, profile, consent, engagement preferences.
- NewsletterSubscription (entity)
  - Member opt-in/out per Newsletter.
- Label (aggregate root)
  - Taxonomy for segmentation; labels attached to Members.
- AudienceSegment (value object)
  - Query expression for targeting.
- MemberAttribution (entity)
  - Last-touch and referrer context at signup.
- MemberAuthToken (entity)
  - Magic link token, expiration, and usage metadata.
- SignupPolicy (value object)
  - Invite-only, paid-only, or open access.
- AbuseGuard (value object)
  - Rate limits and spam prevention signals.

### Member Subscriptions & Payments (local)
Legacy Ghost input: `products`, `benefits`, `products_benefits`, `stripe_products`,
`stripe_prices`, `subscriptions`, `members_products`,
`members_stripe_customers`, `members_stripe_customers_subscriptions`, `offers`,
`offer_redemptions`, `donation_payment_events`.

- Plan (aggregate root, local)
  - Pricing options, benefits, visibility (public/internal), trials.
- Price (entity, local)
  - Billing cadence and currency; belongs to Plan.
- Benefit (entity, local)
  - Perks associated with Plans.
- Subscription (aggregate root, local)
  - Agreement between Member and Plan; lifecycle state.
- ContentEntitlement (entity, local)
  - Grants member access to content; derives from Subscription or manual grant.
- CheckoutSession (entity, local)
  - Ephemeral payment initiation state for providers like Stripe.
- BillingAccount (aggregate root, local)
  - External customer record (Stripe), payment method, billing metadata.
- Offer (aggregate root, local)
  - Discount/trial definition and redemption rules.
- OfferRedemption (entity, local)
  - Audit of a Member using an Offer.
- Donation (aggregate root, local)
  - One-time payment with optional Member link.

### Site Billing & Eligibility (central + local)
No direct legacy mapping.

- BillingProfile (aggregate root, central)
  - Billing identity tied to a SiteIdentity; required for paid marketplace assets.
- MarketplaceEntitlement (entity, central + local cache)
  - Grants access to paid listings for a SiteIdentity (not member content).

### Communication (Newsletters & Email) (local)
Legacy Ghost input: `newsletters`, `emails`, `email_batches`, `email_recipients`,
`email_recipient_failures`, `suppressions`.

- Newsletter (aggregate root)
  - Branding, sender identity, subscription defaults, visibility.
- Issue (aggregate root)
  - A concrete send tied to content or standalone.
  - AudienceSegment target and rendering settings.
- Delivery (entity)
  - Per-recipient delivery status (sent/opened/failed).
- DeliveryBatch (entity)
  - Provider-specific batching metadata.
- Suppression (aggregate root)
  - Global email suppression due to spam/bounce.

Automated/drip emails (welcome, onboarding) are not modeled here — they are
workflows in the Automation & Workflows context.

### Engagement & Community (local + external)
Legacy Ghost input: `comments`, `comment_likes`, `comment_reports`, `recommendations`,
`mentions`.

- CommentThread (aggregate root)
  - Root discussion object per content item.
- Comment (entity)
  - Status, body, author (Member), reply relationships.
- Reaction (entity)
  - Likes or other reactions per Comment.
- Report (entity)
  - Abuse reports linked to Comment.
- Recommendation (aggregate root, external via Explore)
  - External site recommendation with tracking.

### Analytics & Attribution (local + central)
Legacy Ghost input: `members_*_events`, `members_click_events`, `actions`, `milestones`,
`links`.

- AnalyticsEvent (aggregate root, local)
  - Unified event log for member, email, and content engagement.
- StatsSnapshot (value object, local)
  - Precomputed aggregates for dashboards.
- Link (aggregate root, local)
  - Canonical tracked link with attribution metadata.
- NetworkAttribution (aggregate root, central)
  - Explore-level attribution data for cross-site discovery and referrals.

### Extensions (local + central registry)
Legacy Ghost input: `integrations`, `webhooks`, `outbox` (partial).

- ExtensionInstall (entity, local)
  - Per-site install state, configuration, enabled/disabled.
  - References MarketplaceListing and package versions by registry id.
- MarketplaceListing (aggregate root, central)
  - App, Theme, Integration, Service; pricing and compatibility.
- ExtensionPackage (aggregate root, central)
  - Signed artifact, version, manifest, capabilities.
- ExtensionReview (entity, central)
  - Rating + feedback tied to SiteIdentity.


### Custom Data & Schema (local)
No direct legacy mapping.

- SchemaRegistry (aggregate root)
  - Defines CustomObject schemas and Metafield definitions.
- CustomObjectType (entity)
  - Name, fields, validation rules, access policy.
- CustomObjectRecord (aggregate root)
  - Records created by publishers or extensions.
- MetafieldDefinition (entity)
  - Type, scope (resource types), constraints.
- MetafieldValue (entity)
  - Concrete values attached to core resources.

### Work Orchestration & Events (local)
Legacy Ghost input: `jobs`, `outbox`, and import/export services.

- JobDefinition (aggregate root)
  - Recurring or ad-hoc job definition and scheduling metadata.
- JobRun (entity)
  - Execution metadata, status, timings, retry state.
- Task (entity)
  - Work units for long-running processes (email batches, analytics fetch).
- DomainEvent (value object)
  - Normalized event payloads emitted after commit.
- OutboxMessage (aggregate root)
  - Reliable event dispatch to webhooks and external services.
- WebhookSubscription (entity)
  - Subscribed events with delivery configuration.
- QueueProvider (value object)
  - Adapter configuration for in-memory, BullMQ, or Cloudflare Queues.
- ImportExportTask (entity)
  - Structured migration jobs for members, content, or settings.

### Automation & Workflows (local)
Legacy Ghost input: `automated_emails` (superseded by workflows) and the
upstream workflow engine direction. Runs on Work Orchestration primitives
(queues, jobs, outbox) — workflows decide what and why, jobs execute.

- WorkflowDefinition (aggregate root)
  - Trigger (domain event) plus ordered steps: send email, wait, branch.
- WorkflowRun (entity)
  - Per-trigger execution state; each step executes as a job.
- StepRun (entity)
  - Execution metadata, status, and retry state per step.

### Media & Storage (local)
Legacy Ghost input: `files`, storage adapters, and asset URL rewriting.

- MediaAsset (aggregate root)
  - Stored files with type, size, and URL mapping metadata.
- StorageAdapterConfig (value object)
  - Local/remote storage adapter settings and CDN base URLs.

### Activity Feed & Notifications (local)
Legacy Ghost input: `notifications`, `members_*_events`, `actions`.

- ActivityEvent (entity)
  - Aggregated feed events derived from domain events.
- Notification (aggregate root)
  - Admin-facing alerts derived from ActivityEvent projections.

## Identity and access resolution
This resolves several open questions and anchors the rest of the model.

1) Local StaffAccount is authoritative for Site operations.
2) PartnerOrg exists in a centralized Partner Portal.
3) A Site admin grants access to a PartnerOrg, producing an AccessGrant.
4) AccessGrant is mirrored locally with scope, TTL, and audit data.
5) Partner staff authenticate via the Partner Portal and present a scoped token
   to the Site for delegated actions.
6) The Site auto-provisions or maps a local StaffAccount marked as externally
   managed to the Partner Portal subject id.

This avoids duplicating partner identities inside each Site while preserving
local enforcement and auditability.

## Billing opt-in model
- BillingProfile is optional and centralized.
- A Site can operate fully without BillingProfile for free assets.
- Paid marketplace assets require BillingProfile eligibility.
- Enforcement is split:
  - Marketplace Registry validates eligibility at install/upgrade time.
  - Extension runtime enforcement is delegated to the extension developer.

## Externally managed staff lifecycle
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

## Central services boundaries
- Billing Service: owns BillingProfile and entitlements for paid assets.
- Marketplace Registry: owns listings and packages, validates eligibility.
- Partner Portal: owns PartnerOrg identities and delegated access grants.
- Explore Service: owns network graph and recommendations (external).
- ActivityPub Service: external federation service (out of scope for v10 core).

## Migration mapping (current core -> v10)
- Current instance -> Site + Installation
- `users` + `roles` + `roles_users` -> StaffAccount + Role
- `posts` + `posts_meta` -> ContentItem
- `post_revisions` -> ContentRevision
- `tags` + `posts_tags` -> Tag + Tag assignments
- `collections` -> Collection
- `snippets` -> Snippet
- `members` -> Member
- `labels` + `members_labels` -> Label + label assignments
- `members_newsletters` -> NewsletterSubscription
- `products` + `benefits` + `products_benefits` -> Plan + Benefit
- `stripe_products` + `stripe_prices` -> Price
- `subscriptions` -> Subscription
- `members_products` -> ContentEntitlement
- `members_stripe_customers` -> BillingAccount
- `members_stripe_customers_subscriptions` -> ProviderSubscription metadata
- `members_login_events` -> MemberAuthToken (usage/audit)
- `api_keys` -> StaffApiToken + IntegrationToken
- `offers` + `offer_redemptions` -> Offer + OfferRedemption
- `donation_payment_events` -> Donation
- `newsletters` -> Newsletter
- `emails` -> Issue
- `email_batches` -> DeliveryBatch
- `email_recipients` + `email_recipient_failures` -> Delivery
- `suppressions` -> Suppression
- `automated_emails` -> WorkflowDefinition (seeded drip workflows)
- `links` + `redirects` -> Link + RedirectRule
- `comments` -> CommentThread + Comment
- `comment_likes` -> Reaction
- `comment_reports` -> Report
- `recommendations` -> Recommendation (via Explore)
- `mentions` -> External ActivityPub service (out of scope)
- `members_*_events` + `actions` + `members_click_events` -> AnalyticsEvent
- `integrations` -> ExtensionInstall (local)
- `webhooks` -> WebhookSubscription
- `outbox` -> OutboxMessage
- `notifications` -> Notification
- `files` -> MediaAsset
- `settings` + `custom_theme_settings` -> MetafieldValue (phase-gated)
