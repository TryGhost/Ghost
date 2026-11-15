---
"@tryghost/metafield-types": minor
---

Removed `flagOf` from the `./phone` entry point. It drew a country's flag as an emoji, which Windows shows as two letters, and nothing uses it now that Portal's phone input shows the calling code alone.
