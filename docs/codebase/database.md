# Database Structure

Ghost's database schema is defined in
[`schema.js`](../../ghost/core/core/server/data/schema/schema.js). It is the
current shape expected after every migration has run. Bookshelf models in
[`models/`](../../ghost/core/core/server/models/) define relationships and
application behavior; do not infer those rules from the table shape alone.

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
