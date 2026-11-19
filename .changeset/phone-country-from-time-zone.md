---
"@tryghost/metafield-types": minor
---

Added `phoneCountryOfTimeZone`, the country of a time zone such as Portugal for `Europe/Lisbon`, from the browser's own time zone data. `startPhoneEntry` takes an optional time zone and, for a field holding no number, starts from its country before the country of the reader's language, as many browsers speak `en-US` wherever they are. Safari names some zones newer than its own data does, such as `Asia/Kolkata`, and its readers there are given their language's country, as before.
