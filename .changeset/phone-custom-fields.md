---
"@tryghost/metafield-types": minor
---

Added the `phone` field type, a text leaf in the new `phone` format, developed behind the `customFieldTypePhone` Labs flag. Its rule keeps a number in E.164 (`+442079460000`) however it was written, and refuses one without its country code, one with anything else around it, and one with an extension.

`phoneNumberIn(text, country)` reads a phone number as it is dialled in a country, unless it was written with a country code of its own, and gives it in E.164, or undefined when it isn't a number a phone field could keep.
