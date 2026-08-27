# Context Map

## Contexts

### Portal

Path: `apps/portal/CONTEXT.md`

Portal is the visitor-facing membership widget embedded on a Ghost site — the modal that handles member signup, sign-in, paid subscription checkout, offers, and account management.

### Gift Subscriptions

Path: `ghost/core/core/server/services/gifts/CONTEXT.md`

Gift Subscriptions covers prepaid, fixed-duration membership access from gift purchase through gift redemption, gift expiration, gift consumption, and gift continuation into a paid subscription.

### Gift Links

Path: `ghost/core/core/server/services/gift-links/CONTEXT.md`

Gift Links covers shareable access to individual protected posts and pages without creating a membership.

## Relationships

- **Portal ↔ Gift Subscriptions**: Portal presents the purchase and redemption journeys for gift subscriptions.
- **Gift Subscriptions ↔ Gift Links**: A gift-subscription redemption link claims fixed-duration membership access; a Gift Link grants access to one protected post or page.
