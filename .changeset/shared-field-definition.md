---
"@tryghost/metafield-types": minor
---

Added the shape of a field definition as the Admin and Members APIs return it.

- `MetafieldDefinitionSchema` reads a definition (namespace, key, name, type, status, member access and dates) and `MetafieldDefinition` is the type it produces. Ghost writes every definition through it.
- `FIELD_STATUSES`, `FieldStatusSchema`, `FIELD_STATUS` and `FieldStatus` name whether a field is active or archived.
