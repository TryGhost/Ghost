---
"@tryghost/metafield-types": minor
---

Added `hasOnlyPhoneCharacters(text)` to the `./phone` entry point. It returns whether text contains only characters valid in a phone number (digits, +, spaces and the punctuation libphonenumber-js accepts), so a phone input can flag an invalid character while typing without loading the library. A number it flags is one the phone field's validation rejects too, except an RFC 3966 `tel:` URI, which the library accepts.
