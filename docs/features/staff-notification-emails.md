# Staff Notification Emails

Staff notification emails are sent to Ghost admin users to alert them about important member and subscription events. Users can configure which notifications they receive in **Settings > Staff > [User] > Email notifications**.

## Email Types

### 1. Free Member Signup
- **Subject**: `🥳 Free member signup: {member_name}`
- **Alert setting**: `free-signup`
- **Triggered by**: `MemberCreatedEvent` when member status is `free`

### 2. Paid Subscription Started
- **Subject**: `💸 Paid subscription started: {member_name}`
- **Alert setting**: `paid-started`
- **Triggered by**: `SubscriptionActivatedEvent`

### 3. Paid Subscription Cancelled
- **Subject**: `⚠️ Cancellation: {member_name}`
- **Alert setting**: `paid-canceled`
- **Triggered by**: `SubscriptionCancelledEvent`

### 4. Milestone Reached
- **Subject**: Varies based on milestone type
- **Alert setting**: `milestone-received`
- **Triggered by**: `MilestoneCreatedEvent`

### 5. Donation Received
- **Subject**: `💰 One-time payment received: {amount} from {name}`
- **Alert setting**: `donation`
- **Triggered by**: Stripe webhook `checkout.session.completed` for donation payments

## Source Filtering

Staff notifications for member/subscription events are **only sent when the source is `api` or `member`**. This filtering is intentional:

| Source | Context Condition | Staff Notifications Sent? | Rationale |
|--------|------------------|---------------------------|-----------|
| `member` | No context (default) | Yes | Member signed up on the frontend |
| `api` | `context.api_key` exists | Yes | External integration created the member |
| `admin` | `context.user` exists | No | Admin manually created - they already know |
| `import` | `context.import` or `context.importer` | No | Admin is doing the import - they already know |
| `system` | `context.internal` | No | Internal system operation |

### How Source is Determined

The source is determined by `_resolveContextSource()` in `member-repository.js`:

```javascript
_resolveContextSource(context) {
    if (context.import || context.importer) {
        return 'import';
    } else if (context.internal) {
        return 'system';
    } else if (context.api_key) {
        return 'api';
    } else if (context.user) {
        return 'admin';
    } else {
        return 'member';
    }
}
```

### Context Sources Explained

- **`member`**: The default source when no context is provided. Used when members sign up via Portal, the public signup form, or other frontend mechanisms.

- **`api`**: Set when the request is authenticated via an API key (Content API or Admin API integration token). This includes external integrations, automation tools, or third-party services.

- **`admin`**: Set when the request is made by a logged-in user in Ghost Admin (session-authenticated). This includes manually creating members, linking Stripe customers, etc.

- **`import`**: Set during member import operations.

- **`system`**: Set for internal system operations.

## Event Flow

### Member Creation with Stripe Customer

When a member is created via Admin API with a `stripe_customer_id`:

1. `member-bread-service.add()` is called
2. `memberRepository.create()` creates the member and dispatches `MemberCreatedEvent`
3. `memberRepository.linkStripeCustomer()` links the Stripe customer
4. `linkSubscription()` processes subscriptions and dispatches `SubscriptionActivatedEvent`

The context is passed through this entire flow, so the source is correctly determined at each step.

## Code References

- Staff service: `core/server/services/staff/staff-service.js`
- Email templates: `core/server/services/staff/staff-service-emails.js`
- Source resolution: `core/server/services/members/members-api/repositories/member-repository.js`
- Source filter: `staff-service.js:86-88`
