# Database Structure

Ghost's database schema is defined in
`ghost/core/core/server/data/schema/schema.js`.

## Posts

Post statuses are `draft`, `scheduled`, `published`, and `email`. Email posts are
sent without being published on the site. Only published posts are available
through the Content API.

## Tags

Tag visibility is `internal` or `public`.

## Integrations

Integration types are:

- `internal`: private from the API.
- `built-in`: available from the API but restricted on some plans.
- `core`: available from the API and allowed on all plans.
- `custom`: created by a user.

## Member attribution events

Member-created and subscription-created events are deleted with their member.
Their attribution type can be `url`, `post`, `page`, `author`, or `tag`, and
their referrer fields record the source, medium, and URL where available.

The `source` on a member-created event records what created the member. Its
values are `member`, `import`, `system`, `api`, and `admin`, and it must be set
internally.

## Link redirects and clicks

`link_redirects` stores the source path, destination, and associated post for a
tracked link. A member link-click event is stored for every click, including
repeat clicks by the same member.

## Subscriptions

Subscription types are `free`, `comped`, and `paid`. Statuses are `active`,
`expired`, and `canceled`. Paid subscriptions also record cadence, currency,
amount, and payment-provider links.
