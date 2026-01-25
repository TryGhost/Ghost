# Ghost Rewrite PRD v4 Checklist

References:
- `prd-v4.md`
- `prd-v4-operations.md`
- `prd-v4-admin-settings.md`
- `architecture-v4.md`
- `domainmodel-v4.md`

## 1) Staff authentication and access control
- [x] Password-based staff login with rate limiting
- [x] 2FA/device verification flow
- [x] Staff password reset
- [x] Staff invitations with role assignment
- [x] Staff sessions with role/permission enforcement
- [x] Staff API tokens vs integration tokens
- [x] SSO adapters
- [x] Audit trail for staff auth events

## 2) Partner access via Partner Portal
- [x] Access grants with scoped roles and TTL
- [x] Partner Portal token validation
- [x] External staff mapping to local StaffAccount
- [x] Access grant enforcement per request
- [x] Partner audit logging

## 3) Member authentication and signup policy
- [x] Magic-link login tokens
- [x] SignupPolicy enforcement
- [x] AbuseGuard rate limits
- [x] Member auth events persisted
- [x] Session verification for gated content

## 4) Member subscriptions and payments
- [x] Plans/tiers with pricing and benefits
- [x] Offers/discounts with redemption
- [x] CheckoutSession creation
- [x] Prevent duplicate checkout for active subs
- [x] BillingAccount maintenance
- [x] ContentEntitlements
- [ ] Subscription lifecycle events

## 5) Content authoring and publishing
- [ ] Posts/pages with Lexical content + revisions
- [ ] Tags, collections, author profiles
- [ ] Draft/scheduled/published states
- [ ] Domain events for content lifecycle
- [ ] URL routing + cache invalidation

## 6) Newsletters and email delivery
- [ ] Newsletters with branding and defaults
- [ ] Issues linked to content or standalone
- [ ] Queue-backed email sending
- [ ] Delivery status tracking
- [ ] Suppression lists + automated emails
- [ ] Email lifecycle events

## 7) Activity feed and analytics
- [ ] Activity event store + query
- [ ] Aggregated event types
- [ ] Snapshot pipeline
- [ ] Explore attribution integration

## 8) Link tracking and redirects
- [ ] Canonical tracked links
- [ ] Bulk link updates with redirects
- [ ] Click events + attribution

## 9) Media storage and CDN configuration
- [ ] File uploads with metadata
- [ ] Switchable storage adapters
- [ ] CDN base URL rewriting
- [ ] Asset URL integrity in Lexical content

## 10) Integrations and webhooks
- [ ] Integration tokens + webhooks
- [ ] Webhook ownership enforcement
- [ ] Outbox-backed webhook dispatch
- [ ] Webhook retry/backoff

## 11) Marketplace and extensions
- [ ] Registry listing discovery
- [ ] Paid listing eligibility checks
- [ ] Local extension install state
- [ ] Scoped API/webhook permissions
- [ ] Runtime license checks (extension-owned)

## 12) Site billing opt-in
- [ ] BillingProfile enrollment
- [ ] Central billing link without core impact
- [ ] Cached MarketplaceEntitlements

## 13) Settings and configuration
- [ ] Typed settings
- [ ] Metafield migration support
- [ ] Custom objects CRUD

## 14) Notifications
- [ ] Admin notifications CRUD
- [ ] System notifications from events/jobs

## 15) Work orchestration and jobs
- [ ] Queue provider adapter
- [ ] Named queues with retry/backoff
- [ ] JobDefinition/JobRun
- [ ] Async offload for heavy work
- [ ] Idempotency keys
- [ ] Operational visibility APIs

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

## Operations PRD
### Data export/import
- [ ] Exporter table set output
- [ ] Import legacy formats
- [ ] Legacy field mapping

### Migrations and schema utilities
- [ ] Rollback and re-apply migrations
- [ ] Idempotent migrations
- [ ] Default fixtures
- [ ] Nullable migration utilities

### Settings integrity
- [ ] Core settings allowlist
- [ ] Non-core settings migration requirements

### URL service
- [ ] URL generator uses routing rules
- [ ] Tags/authors with no public content
- [ ] Subdirectory URL support

### Email analytics events and suppression
- [ ] Mailgun event handling
- [ ] Complaint event suppression
- [ ] Unsubscribe event handling
- [ ] Ignore invalid events
- [ ] Suppression list updates

### Member welcome emails and outbox
- [ ] MemberCreatedEvent outbox entries
- [ ] Imported/admin-created member handling
- [ ] Welcome email template validation

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
- [ ] Outbox processing
- [ ] Update-check job
- [ ] Token cleanup job

### Metrics
- [ ] Prometheus client exposure

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
