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
- `processReminders()`, `processConsumed()`, and `processExpired()` own gift
  lifecycle work. `GiftDeliveryService` owns email-delivery creation,
  post-commit dispatch, cancellation, and processing behind a separate
  interface. Email delivery starts immediately after purchase through an
  in-process event. Delivery claims are atomic; stale in-progress claims are
  retried after a crash, so mail-transport acceptance is at least once.
- `reassignRedeemer(...)` is the import capability.

The `Gift` model, gift-delivery data schema, their repositories, Bookshelf
queries, Stripe checkout and email collaborators are internal adapters.
