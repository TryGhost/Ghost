---
"@tryghost/metafield-types": minor
---

Changed a repeated list option to be refused on the option that repeats an earlier one, and options to repeat each other whatever their case.

- `SetSettingsSchema` refuses a repeat at `options.<index>` of the later option, with "This option already exists.". It used to refuse the list at `options` with "Give each option once.".
- Two options are the same option when their text matches without regard to case, so a list can't offer both "Podcasts" and "podcasts". It used to compare text exactly.
- `optionKey(option)` is exported from `./structure`: the text two options are compared by, so a client that tidies a list skips the same repeats the schema refuses.
