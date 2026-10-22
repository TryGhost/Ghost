# Boot composition

Boot owns application configuration and construction. Email Address's legacy
initializer is wired here; its sender rules live in
[`shared/email-address`](../shared/email-address/README.md).

`email-address.js` retains the existing CommonJS `init()` / `.service` interface
while dependency extraction is reviewed. `core/boot.js` initializes it after
settings and before dependent services. Composition roots pass its configured
instance to implementations; getters preserve access for consumers constructed
before initialization. Request handlers do not initialize Email Address.

Awaited kernel initializer adoption is a separate follow-up. Relocation does
not make this initializer managed, add lifecycle hooks, or change settings
timing.
