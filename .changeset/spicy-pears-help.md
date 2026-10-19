---
"@tryghost/metafield-types": minor
---

Replaced `parseIdentity`, `formatIdentity` and `IDENTITY_SEGMENT` with `IdentitySchema`, which reads an identity into its namespace, key and parts and writes it back, each a type that only its own check produces
