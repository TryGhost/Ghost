# Mail delivery

GhostMailer sends transactional messages. Bulk delivery uses the Mailgun client
in the neighboring `mailgun` directory.

`formatAddressForDelivery` owns the Gmail display-name compatibility rule shared
by those delivery paths. General mailbox parsing and formatting live in
`@tryghost/parse-email-address/mailbox`, independently of Ghost settings and boot.

Sender helpers, newsletter rendering, Staff, Gifts and Welcome Emails currently
use the delivery formatter because their interfaces already return delivery
strings. This is a compatibility bridge: retain their escaping, checkmark removal
and cached string values during extraction. As those interfaces accept structured
mailboxes, move formatting to the transactional and bulk delivery adapters and
remove these earlier calls. [Shared Email Address](../../../shared/email-address/README.md)
owns sender policy, with construction and readiness in Boot; the mail adapters
own provider compatibility. Each caller supplies a policy getter to GhostMailer
so a mailer constructed before boot still reads current sender defaults when
sending. GhostMailer keeps its existing constructor identity.
