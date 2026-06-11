# Context

## Glossary

### Portal button

The ambient on-site control that lets a visitor open Portal without following a specific Portal link. It does not control whether a specific Portal link opens Portal.

### Offer link

A Portal link for viewing and accepting a membership offer. Offer links always open the offer page — even when the Portal button is hidden — and only for visitors eligible to accept the offer. Portal offer triggers are offer links.

For ineligible visitors — existing paid members (excluding complimentary members), or expired, archived, or retention offers — the link is silently ignored and Portal does not open.

### Checkout button

A site control that starts checkout for a membership plan, sending visitors directly to checkout instead of opening an offer page.

### Checkout attempt

An attempt to start checkout for a membership plan. Checkout attempts are protected by request limits across checkout traffic and repeated attempts against one email address.

When a checkout attempt indicates that the submitted email should sign in instead, Portal continues with the sign-in email flow rather than asking the visitor to retry checkout.
