# Database Structure

Ghost's database schema is defined in
[`schema.js`](../../ghost/core/core/server/data/schema/schema.js). It is the
current shape expected after every migration has run. Bookshelf models in
[`models/`](../../ghost/core/core/server/models/) define relationships and
application behavior; do not infer those rules from the table shape alone.

The sections below are domain maps, not a replacement for the schema. They
explain why related tables exist and where to start when changing them.

## Posts

Post statuses are `draft`, `scheduled`, `published`, and `sent`. Sent posts are
sent without being published on the site. Only published posts are available
through the Content API.

## Tags

Tag visibility is `internal` or `public`.

## Integrations

Integration types are:

- `internal`: private from the API.
- `builtin`: created as one of Ghost's built-in integrations.
- `core`: created and managed by Ghost core.
- `custom`: created by a user.

## Member attribution events

Member-created and subscription-created events are deleted with their member.
Their attribution type can be `url`, `post`, `page`, `author`, or `tag`, and
their referrer fields record the source, medium, and URL where available.

The `source` on a member-created event records what created the member. Its
values are `member`, `import`, `system`, `api`, and `admin`.

## Members

`members` is the central record for a reader. It stores identity, status,
profile information, email engagement totals, and communication preferences.
Related data is separated by responsibility:

| Responsibility | Tables |
| --- | --- |
| Labels | `labels`, `members_labels` |
| Custom fields | `members_custom_fields`, `members_custom_field_values` |
| Newsletter subscriptions | `newsletters`, `members_newsletters` |
| Tiers and access | `products`, `members_products`, `subscriptions` |
| Stripe state | `members_stripe_customers`, `members_stripe_customers_subscriptions`, `members_current_subscription`, `stripe_products`, `stripe_prices` |
| Offers | `offers`, `offer_redemptions` |
| Lifecycle and attribution history | the `members_*_events` tables |

`labels` has a many-to-many relationship with `members` through
`members_labels`. Newsletter subscriptions use the same pattern through
`members_newsletters`. Custom-field definitions are stored once in
`members_custom_fields`; `members_custom_field_values` stores the values a
member has supplied.

Ghost keeps a provider-independent subscription in `subscriptions`. The Stripe
tables cache the provider records needed to synchronize paid membership state.
`members_current_subscription` is the one-row-per-member lookup used to expose
the resolved Stripe subscription in Admin and member filtering. Read the member
model, the resolved-subscription view, and the Stripe service as well as the
schema before changing these relationships.

The event tables are append-oriented history used for attribution, analytics,
and changes to member or subscription state. They are not alternative sources
of truth for the current member record.

## Newsletters and email

A newsletter send is represented across four main tables:

| Table | Purpose |
| --- | --- |
| `emails` | One send for one post, including rendered content, recipient filter, aggregate counts, tracking options, and overall status |
| `email_batches` | Provider submissions for an email, including the member segment, provider identifier, status, and batch-level errors |
| `email_recipients` | The recipients selected for a send, their batch, a snapshot of member identity, and processing/delivery/open/failure timestamps |
| `email_recipient_failures` | Structured temporary or permanent delivery failure information for a recipient |

This split answers three different questions: `emails` records what Ghost sent,
`email_batches` records how it was submitted to the provider, and
`email_recipients` records who was included and what happened to each delivery.
Do not reconstruct a historical recipient list from current member or segment
state; the recipient rows are the send-time record.

`posts.newsletter_id` and `emails.newsletter_id` associate the content and send
with a newsletter. The `newsletters` table owns newsletter identity, sender
configuration, subscription defaults, and presentation settings.

`email_spam_complaint_events` records complaint events associated with a member
and email. Member rows also cache aggregate engagement values for browsing and
filtering; the per-send and per-recipient tables remain the detailed record.

Automated emails use a separate set of `automation_*`,
`welcome_email_automation_*`, and `automated_email_recipients` tables. They do
not create newsletter `emails` and `email_recipients` rows.

## Link redirects and clicks

`redirects` stores the source path, destination, and associated post or
automation action for a tracked link. `members_click_events` stores every
member click, including repeat clicks by the same member.

## Subscriptions

Subscription types are `free`, `comped`, and `paid`. Statuses are `active`,
`expired`, and `canceled`. Paid subscriptions also record cadence, currency,
amount, and payment-provider links.

For changing this structure, follow the
[database migrations guide](../practices/database-migrations.md). Keep the
schema definition, migration, exporter table lists, and integrity tests in sync.
For initial data and settings defaults, see the
[schema and default data guide](../../ghost/core/core/server/data/schema/README.md).
