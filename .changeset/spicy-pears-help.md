---
"@tryghost/metafield-types": minor
---

Changed `./identity` to name a field through types that only a check produces, and renamed the parts helper.

- `IdentityTextSchema` reads an identity such as `custom.shipping_address.country` into its namespace, key and parts, and writes one back. `z.safeDecode(IdentityTextSchema, text)` replaces `parseIdentity`, and `z.encode(IdentityTextSchema, identity)` replaces `formatIdentity`.
- `IdentitySchema` checks an identity whose segments arrive apart, such as a route's namespace and key. Reading a whole field's identity can leave `parts` out; what it reads always has them.
- `NamespaceSchema`, `KeySchema` and `PartSchema` check one segment each and produce the `Namespace`, `Key` and `Part` types. They replace `IDENTITY_SEGMENT`.
- `Identity` is the decoded shape, with `parts` in place of `partPath`. `FieldIdentity` and `FieldIdentityString` are removed.
- `CUSTOM_NAMESPACE` is a `Namespace` rather than the literal `'custom'`.
- `./identity` now loads `zod/mini`.
- `subFieldsOf` is renamed `partsOf`.
