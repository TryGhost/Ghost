# Portal

Portal is the visitor-facing membership widget embedded on a Ghost site. It handles member signup, sign-in, checkout, offers, account management, and the visitor-facing gift-subscription journeys.

## Language

**Portal button**:
The ambient on-site control that lets a visitor open Portal without following a specific Portal link. It does not control whether a specific Portal link opens Portal.

**Offer link**:
A Portal link for viewing and accepting a membership offer. Offer links always open the offer page — even when the Portal button is hidden — and only for visitors eligible to accept the offer. Portal offer triggers are offer links.

For ineligible visitors — existing paid members (excluding complimentary members), or expired, archived, or retention offers — the link is silently ignored and Portal does not open.

**Checkout button**:
A site control that starts checkout for a membership plan, sending visitors directly to checkout instead of opening an offer page.

**Checkout attempt**:
An attempt to start checkout for a membership plan. Checkout attempts are protected by request limits across checkout traffic and repeated attempts against one email address.

When a checkout attempt is rejected because an active paid subscription already exists: a signed-out visitor is continued into the sign-in email flow, while a signed-in member is told they already have an active subscription — no sign-in email is sent.

**Gift checkout**:
The Portal journey in which a buyer selects a duration and membership tier and starts the one-time purchase of a gift subscription.

_Avoid_: Gift purchase, gift page

**Portal gift promotion**:
The publisher-controlled presentation of Ghost-owned entry points into gift checkout. Signup and account promotion are controlled independently, and neither controls whether gift checkout itself is available through a direct Portal link.

_Avoid_: Gift subscriptions enabled, gifting enabled, global gift promotion

**Signup gift entry point**:
Portal promotion in the signup journey for a visitor buying membership for someone else. Its visibility is independent of the account gift entry point.

_Avoid_: Gift signup, account gift entry point

**Account gift entry point**:
Portal promotion in the account journey for paid and complimentary members buying a gift for someone else. It is not presented to free members or members receiving gifted access.

_Avoid_: Gift continuation, gift-recipient card

**Gift redemption page**:
The Portal surface opened from a redemption link, where a visitor or signed-in member can review and claim a gift subscription.

_Avoid_: Gift Link page
