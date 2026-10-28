---
"@tryghost/koenig-lexical": minor
---

Added smart quotes to the editor: straight quotes and apostrophes are converted to typographic ones as you type or paste, following https://smartquotesforsmartpeople.com, including primes for feet and inches (5′10″) and quotes typed with dead keys. The quotation marks follow the publication language (`cardConfig.locale`), e.g. „German“ or « French », and the plugin is enabled with `cardConfig.feature.smartQuotes`. Inline code and `{replacement, "strings"}` are left untouched.
