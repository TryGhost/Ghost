## 0.6.0

### Minor Changes

- Added a way to build a new field type behind a Labs flag. `FIELD_TYPE_FLAGS` lists the types still in development with the Labs flag each is behind, and a type with no flag there is released. `isCreatableType(type, isFlagOn)` says whether a field of a type can be created given which flags are on. Every type is released today.

- Added `hasOnlyPhoneCharacters(text)` to the `./phone` entry point. It returns whether text contains only characters valid in a phone number (digits, +, spaces and the punctuation libphonenumber-js accepts), so a phone input can flag an invalid character while typing without loading the library. A number it flags is one the phone field's validation rejects too, except an RFC 3966 `tel:` URI, which the library accepts.

- Added `phoneCountryOfTimeZone`, the country of a time zone such as Portugal for `Europe/Lisbon`, from the browser's own time zone data. `startPhoneEntry` takes an optional time zone and, for a field holding no number, starts from its country before the country of the reader's language, as many browsers speak `en-US` wherever they are. Safari names some zones newer than its own data does, such as `Asia/Kolkata`, and its readers there are given their language's country, as before.

- Added the `phone` field type, a text leaf in the new `phone` format, developed behind the `customFieldTypePhone` Labs flag. Its rule keeps a number in E.164 (`+442079460000`) however it was written, after a + or the 00 most countries dial abroad with. It accepts only a number its country has given out, as libphonenumber-js's full metadata has them, and refuses one without its country code, one with anything else around it, and one with an extension.

  `phoneNumberIn(text, country)` reads a phone number the same way, as it is dialled in a country unless it was written with a country code of its own, and gives it in E.164, or undefined when it isn't a number a phone field could keep.

  `filterTextFor(leaf, typed, country)` is what a filter on a text leaf looks for: what was typed, as the leaf's field holds it. A phone field's filter then finds a number held in E.164 however it was written: a whole number in E.164, read in `country` unless it gives its code, and part of one as its digits.

  The `./phone` entry point, which a browser app can load without zod or libphonenumber-js, holds what a phone input beside a choice of country needs: what it starts from, shows and sends as someone types or picks a country (`startPhoneEntry`, `typeNumber`, `pickCountry`, `shownCountry`, `withCallingCode`), each country's calling code and way of dialling abroad (`CALLING_CODES`, `INTERNATIONAL_PREFIXES`), what tells apart the countries sharing a calling code (`SHARED_CODES`), `phoneCountryOptions`, `readCallingCode`, `phoneCountryOfLocales`, `isPhoneCountry` and `flagOf`.

- Removed `flagOf` from the `./phone` entry point. It drew a country's flag as an emoji, which Windows shows as two letters, and nothing uses it now that Portal's phone input shows the calling code alone.

- Renamed a text leaf's `size` to `format`, `TEXT_SIZES` to `TEXT_FORMATS` and `TextSize` to `TextFormat`. What sets a text leaf apart isn't always how much text it holds: a format can also be text in a particular shape, such as a phone number.

### Patch Changes

- In Node, libphonenumber-js now loads the first time a phone number is read rather than when the package is imported, so a server that never reads one doesn't hold its metadata. Bundles still load it up front.

- Changed the README to point contributors at the package's new docs folder.

- Changed the package's repository directory to `contracts/metafield-types`, where its source now lives in the Ghost repository.

- Changed `phoneCountryOptions` to put each calling code in parentheses, such as `United Kingdom (+44)`.

- Changed phone number validation errors to be specific to the number's country. An invalid number now gets an example from its own country, such as `+55 11 96123 4567` for a +55 number, where every error used to show a British one. The error also says when the number is too short or too long, or when its country code doesn't exist.
