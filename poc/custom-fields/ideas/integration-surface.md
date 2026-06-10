# Integration surface (real implementation checklist)

The POC covers four UI surfaces (admin define, member detail, signup, account). A real custom-fields feature touches far more of Ghost, because member data flows through many systems. This is the "what else" list to scope before committing to a production build.

Not built, not exhaustive, a living checklist.

## Data in / out

- **CSV import** (Members → Import): map CSV columns to custom fields; type validation; create-missing-definition behavior; how unknown columns are handled.
- **CSV export** (Members → Export): include custom field values as columns; stable column naming (the field `key`).
- **Admin API — members**: read/create/update members must serialize + accept custom values (output serializer + input mapper + permitted attributes).
- **Admin API — definitions**: CRUD endpoints for the field definitions and placements themselves (so integrations/themes can read the schema).
- **Members API** (Portal/site): the `/members/api/member` read + update path (today's allowlist is name/subscribed/newsletters/comment-notifications).
- **Bulk actions** on the members list (e.g. set a custom field value across a selection).

## Filtering & segmentation

- **NQL member filters** (admin members list + email recipient filters + segments): filter/segment members by custom field value. **This is the big driver for storage design**, a JSON blob won't filter efficiently; a queryable table will.
- **Email "send to" / newsletter segments**: target sends by custom field.
- **Saved filters / member search** in admin.

## Email & personalization

- **Newsletter personalization**: using custom fields as merge tags in email content (e.g. greet by a custom "First name"). Big, high-demand, and interacts with the built-in `name`.
- **Welcome emails / automations**: trigger or branch on custom field values; use them in conditions.

## Themes & Portal

- **`@member` in themes**: should custom fields be exposed to Handlebars for logged-in members? (gating, personalization in templates)
- **Portal**: signup (Story 3), account (Story 4), and the future post-signup survey surface.

## Integrations

- **Webhooks** (`member.added`, `member.edited`): include custom fields in payloads.
- **Zapier / third-party integrations**: member triggers/actions expose custom fields.
- **Migration tooling** (`@tryghost/migrate`, Substack/Mailchimp/etc. importers): map source custom fields → Ghost definitions.

## Data lifecycle & compliance

- **Site export/import** (the Ghost JSON used to move between installs): definitions + placements + values must round-trip.
- **GDPR / "download your data"**: member data exports must include custom values.
- **Member deletion cascade**: drop values (and decide what deleting a *definition* does to stored values, the orphaned-value question).
- **Backup/restore** consistency.

## Cross-cutting

- **Limits**: cap on number of custom fields (and per plan, for Ghost Pro?).
- **i18n**: surrounding UI strings translated; field labels are user-defined (not translated by us).
- **Schema/migrations**: the actual DB change (definitions table, values table or JSON column, placements). See [LEARNINGS.md](../LEARNINGS.md) "Backend implications".
- **Permissions/roles**: who can define fields vs edit values (staff roles).

## Priority hint

Storage choice (JSON vs queryable table) should be made up front, because **filtering/segmentation and CSV/import** are the surfaces most likely to be expected on day one, and they're exactly the ones a JSON blob makes painful.
