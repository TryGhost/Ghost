---
"@tryghost/metafield-types": patch
---

Changed phone number validation errors to be specific to the number's country. An invalid number now gets an example from its own country, such as `+55 11 96123 4567` for a +55 number, where every error used to show a British one. The error also says when the number is too short or too long, or when its country code doesn't exist.
