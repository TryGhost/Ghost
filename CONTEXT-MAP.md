# Context Map

## Contexts

### Portal

Path: `apps/portal/CONTEXT.md`

Portal is the visitor-facing membership widget embedded on a Ghost site — the modal that handles member signup, sign-in, paid subscription checkout, offers, and account management.

### Gift Subscriptions

Path: `ghost/core/server/services/gifts/CONTEXT.md`

Gift Subscriptions covers prepaid, fixed-duration membership access from gift purchase through gift redemption, gift expiration, gift consumption, and gift continuation into a paid subscription.

### Gift Links

Path: `ghost/core/server/services/gift-links/CONTEXT.md`

Gift Links covers shareable access to individual protected posts and pages without creating a membership.

### Newsletter Email Sending

Path: `ghost/core/server/services/email-service/CONTEXT.md`

Newsletter Email Sending covers the preparation and submission of newsletter emails to the configured email provider.

### App Contracts

Path: `contracts/app-contracts/CONTEXT.md`

App Contracts covers what Ghost and an app must agree on: how an app describes itself in its manifest, how two versions of that manifest differ, and how Admin and an app's page talk over the bridge while Admin shows it.

### App Installations

Path: `ghost/core/server/services/app-installations/CONTEXT.md`

App Installations covers a site's record of the apps it has approved, from the publisher's review of an install link through approvals of later changes to uninstalling.

### Segments

Path: `ghost/core/server/services/segments/CONTEXT.md`

Segments covers named filters over members, which Admin's members list shows as saved views.

### Authentication and Authorization

Path: `ghost/core/server/auth/CONTEXT.md`

Authentication and Authorization covers how Ghost works out who made a request and decides what they may do.

### Better Auth

Path: `ghost/core/server/auth/better-auth/CONTEXT.md`

Better Auth covers how staff users sign in, stay signed in and keep a password when a site runs the Better Auth engine, and the parts of that the legacy engine shares.

## Relationships

- **Portal ↔ Gift Subscriptions**: Portal presents the purchase and redemption journeys for gift subscriptions.
- **Gift Subscriptions ↔ Gift Links**: A gift-subscription redemption link claims fixed-duration membership access; a Gift Link grants access to one protected post or page.
- **Newsletter Email Sending ↔ Gift Subscriptions**: Newsletter Email Sending describes the status of a whole newsletter send; Gift Subscriptions' email delivery status describes one recipient's gift email.
- **Authentication and Authorization ↔ Better Auth**: Better Auth signs staff users in and keeps their sessions; Authentication and Authorization turns a verified session into a principal and decides what it may do.
- **Authentication and Authorization ↔ App Installations**: An app principal names the installation the app acts through. Nothing creates one yet, so an app's calls resolve to the staff user's principal.
- **Authentication and Authorization ↔ App Contracts**: Each scope in App Contracts' scope registry is a permission key as Authentication and Authorization names it. Admin's bridge holds an app to its approved scopes; the policy doesn't check them yet.
- **App Contracts ↔ App Installations**: App Installations keeps parsed manifests as App Contracts defines them, and asks App Contracts which changes between an approved manifest and a newer one need the publisher's approval.
