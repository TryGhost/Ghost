# Gift Subscriptions

Gift Subscriptions covers prepaid, fixed-duration membership access intended to be shared and claimed. Its language spans gift purchase, gift redemption, gift expiration, gift consumption, and gift continuation into a paid subscription.

## Language

### Roles

**Buyer**:
The person who pays for a gift subscription. A buyer need not be a member and may also become the redeemer if eligible.
_Avoid_: Purchaser, recipient, redeemer

**Redeemer**:
The member who claims a gift subscription and receives its access. The redeemer is determined at redemption, not purchase.
_Avoid_: Recipient, buyer

**Recipient**:
The person for whom a gift subscription is intended. Their email routes delivery but does not reserve redemption; they need not be a member and do not become the redeemer until they claim the gift.
_Avoid_: Receiver, redeemer

### Purchase and claim

**Gift subscription**:
A prepaid, non-renewing entitlement to one membership tier for a fixed period. It begins when claimed rather than when purchased.
_Avoid_: Gift membership, recurring subscription

**Gift purchase**:
A one-time purchase that creates a gift subscription for the buyer to share. Completing a gift purchase does not mean that an emailed gift has been sent.
_Avoid_: Gift checkout

**Delivery method**:
The buyer's chosen way of handing over a gift subscription: the publication emails it to a recipient, or the buyer shares the redemption link privately.
_Avoid_: Delivery mode

**Redemption link**:
A single-use, time-limited link through which a purchased gift subscription can be viewed and claimed. Its bearer may see the gift's buyer name, intended recipient name, and personal message, but not email-routing or delivery details.
_Avoid_: Gift Link

**Gift redemption**:
The act of claiming an eligible gift subscription. The member who claims it becomes the redeemer and gifted access begins at that point.
_Avoid_: Gift activation

**Gift delivery**:
Communicating a gift subscription's redemption link to its recipient by email. Delivery does not claim the gift or begin gifted access.
_Avoid_: Gift redemption, gift activation

**Scheduled delivery**:
A gift delivery whose recipient email is planned for a future delivery date. Scheduling delivery does not delay redemption availability.
_Avoid_: Scheduled gift, scheduled redemption

**Delivery date**:
The publication-local calendar date selected for a scheduled delivery. At 09:00 in the publication timezone it makes the recipient email due; the current site-calendar date means immediate delivery. It does not delay redemption availability.
_Avoid_: Delivery time, deliver-at date

**Personal message**:
A note from the buyer that forms part of the gift and can be presented wherever the gift is shown, including email and redemption experiences.
_Avoid_: Delivery message, email message

**Gift sent**:
The recipient email has been accepted by the publication's configured mail transport. This completes gift delivery even when no later provider outcome is available.
_Avoid_: Gift delivered, provider delivery

**Email delivery status**:
The current progress of handing a recipient email to the configured mail transport: pending, sending, sent, failed, or cancelled. It is separate from any later provider-reported outcome.
_Avoid_: Delivery outcome

**Delivery outcome**:
A gift email's latest provider-reported result, such as delivered, temporarily failed, or permanently failed. The outcome remains unknown when the configured transport provides no delivery telemetry.
_Avoid_: Gift sent, delivery state

### Time and lifecycle

**Redemption availability**:
The instant from which a gift subscription may be claimed. It begins at purchase for every gift, including one whose recipient email is scheduled for later.
_Avoid_: Gift activation, delivery time

**Claim window**:
The period from gift purchase until gift expiration in which an unredeemed gift subscription may be claimed. It may exceed 365 days when delivery is scheduled for a future date.
_Avoid_: Gift duration, access period

**Expiry anchor**:
The publication-local calendar date from which gift expiration is calculated. It is the selected delivery date for a scheduled delivery and the gift purchase date otherwise.
_Avoid_: Claim-window start, redemption availability

**Gift duration**:
The total length of gifted access, measured from redemption.
_Avoid_: Gift cadence, billing period

**Gift cadence**:
The monthly or yearly membership price basis used to value a gift subscription. It does not make the gift recurring.
_Avoid_: Gift duration, renewal interval

**Gift expiration**:
The end of an unredeemed gift subscription's claim window. It falls 365 site-calendar days after the expiry anchor; later email handling does not move it.
_Avoid_: Gift consumption

**Gift consumption**:
The end of a redeemed gift subscription's role in providing access, either when its duration finishes or a paid subscription takes over.
_Avoid_: Gift expiration, cancellation

**Consumption reminder**:
The email sent to a redeemer, at most once per gift and up to seven days before gift consumption, so gift continuation can be arranged before gifted access ends.
_Avoid_: Expiry reminder, expiration reminder

**Gift continuation**:
Starting a paid subscription from gifted access while carrying the remaining gifted time forward before billing begins.
_Avoid_: Gift renewal
