# Email Address policy

`EmailAddressService` owns Ghost's sender defaults, allowed senders, fallback and
reply-to selection, and verification rules. It receives live configuration and
settings callbacks, validation and logging. It does not look up application
dependencies or initialize itself.

[Boot](../../boot/email-address-service-wrapper.js) constructs one configured
instance. Consumer composition roots inject that instance or a getter where
construction precedes readiness. Retained mailers read the policy at send time;
newsletter rendering and sending retain the same instance. Welcome Emails keeps
its existing derived sender cache until reload.

Mailbox mechanics belong to `@tryghost/parse-email-address/mailbox`. Provider
formatting belongs to [mail delivery](../../server/lib/mail/README.md). Parsing
does not validate a sender or normalize its domain.

## Relocation and initialization

The former `server/services/email-address` entry has moved: policy lives here
and configuration wiring lives in Boot. The synchronous, idempotent `init()` and
initially undefined `.service` are retained in
[`boot/email-address.js`](../../boot/email-address.js). This is relocation and
dependency preparation; awaited `defineService` adoption remains separate.

Construction performs no settings reads or external work. Each operation reads
current configuration through the injected callbacks. Initialization keeps one
instance; synchronous construction failure leaves initialization retryable.
There are no resources, shutdown hooks or replacement semantics.

Settings and Newsletter verification still read the historical
`defaultFromAddress` property, which is undefined and delegates the default to
GhostMailer. Relocation preserves that fallback; correcting the property needs
separate characterization. Callback and validator errors still propagate to
callers. The earlier audit's gaps in failure-path coverage remain recorded in
the historical entry below.

The [previous inventory entry](https://github.com/TryGhost/Ghost/blob/db90cf0f34cc09b88e3ea17ab2aa9fb5997467ec/ghost/core/server/services/service-inventory.yaml#L2433)
preserves the original audit, its source revisions and contract evidence.
Current coverage follows the implementation in
[`test/unit/shared/email-address`](../../../test/unit/shared/email-address/),
with composition and retained-consumer checks in
[`test/unit/boot/email-address.test.ts`](../../../test/unit/boot/email-address.test.ts)
and boot ordering in
[`test/unit/boot/init-services.test.ts`](../../../test/unit/boot/init-services.test.ts).

Dependency checks apply to this directory independently of the services
inventory. Only reviewed libraries, local implementation files and type-only
contracts may be imported. Runtime consumers obtain the configured capability
through composition rather than constructing the Shared implementation.
