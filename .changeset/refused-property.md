---
"@tryghost/metafield-types": minor
---

Added `refusedProperty(path)`, which names where a refusal points within what was sent by its path, with parts and positions joined by dots, such as `settings.options.2` for a field's third option. Ghost reports a custom field refusal's `property` this way, and a form can file the problems it finds under the same keys.
