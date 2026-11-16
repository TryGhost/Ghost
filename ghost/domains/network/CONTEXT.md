# Network

The network domain owns how a Ghost site relates to other sites on the web:
which sites it recommends, which sites recommend it, and the mentions that
carry those signals between sites.

## Language

- **Recommendation**: another site this site tells its readers about. It has a
  URL, a title and optional metadata fetched from that site.
- **Incoming recommendation**: another site that recommends this one. It is
  learned from a verified mention whose source is that site's well-known
  recommendations file.
- **Well-known recommendations file**: `/.well-known/recommendations.json`,
  the public list of this site's recommendations that other sites read.
- **Click event** and **subscribe event**: records that a reader followed a
  recommendation, or subscribed through one.
- **Mention**: a webmention received from or sent to another site. Mentions
  still live in `ghost/core/server/services/mentions`.

## What it owns

- Tables: `recommendations`, `recommendation_click_events`,
  `recommendation_subscribe_events`.
- The setting `recommendations_enabled`.
- The `recommendation` permissions.

## What it does not own

- Who receives the "recommendation received" staff alert. That is a staff
  user's `recommendation_notifications` preference, which belongs to identity.
- Fetching another site's page and metadata. That belongs to publishing.
