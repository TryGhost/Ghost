---
"@tryghost/metafield-types": minor
---

Added the `phone` field type, a text leaf in the new `phone` format, developed behind the `customFieldTypePhone` Labs flag. Its rule keeps a number in E.164 (`+442079460000`) however it was written, and refuses one without its country code, one with anything else around it, and one with an extension.
