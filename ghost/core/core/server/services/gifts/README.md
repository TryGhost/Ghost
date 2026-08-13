# Gifts

This module owns the gift-subscription journey. Its interface is
capability-oriented; callers do not receive `Gift` entities, Bookshelf models,
transactions, or Stripe objects.

## Interface

- `startCheckout(input)` owns the `giftSubCustomization` flag, duration
  catalogue, Portal plan gate, tier/cadence validation, authoritative price,
  token, success parameters, metadata, customer, and one-time payment.
- `preparePaidContinuation(input)` validates an active gift and returns the
  stable tier/cadence/trial decision consumed by the normal subscription
  checkout path.
- `getRedeemable(input)` and `redeem(input)` return the public redemption DTO.
- `completePurchase(input)` and `handlePaymentRefund(input)` accept normalized
  payment outcomes.
- `handlePaidSubscriptionActivation(memberId)` consumes gift time when a paid
  subscription takes over.
- `getMemberPresentations(memberIds)`, `getPreview(token)`,
  `browsePurchaseEvents(...)`, and `browseRedemptionEvents(...)` expose
  stable read models.
- `processDeliveries()`, `processReminders()`, `processConsumed()`, and
  `processExpired()` own due lifecycle work; scheduler and HTTP triggers remain
  adapters. Delivery claims are atomic and each delivery makes one Mailgun
  acceptance attempt.
- `recordDeliveryOutcome(...)` retains only the newest Mailgun delivery outcome;
  mail transport acceptance remains the authoritative sent fact. A newly
  recorded permanent provider failure sends the buyer a best-effort
  transactional notification containing the gift link for manual sharing.
- `reassignRedeemer(...)` is the import capability.

The `Gift` and `GiftDelivery` models, their repositories, Bookshelf queries,
Stripe checkout, email, scheduling, and notification collaborators are internal
adapters. Recipient delivery uses the bulk Mailgun account so delivery outcomes
are observable; buyer-facing confirmations and failure notices use the
provider-agnostic transactional mailer.
