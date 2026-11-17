## 0.5.0

### Minor Changes

- Added a way to build a new field type behind a Labs flag. `FIELD_TYPE_FLAGS` lists the types still in development with the Labs flag each is behind, and a type with no flag there is released. `isCreatableType(type, isFlagOn)` says whether a field of a type can be created given which flags are on. Every type is released today.

- Added the `phone` field type, a text leaf in the new `phone` format, developed behind the `customFieldTypePhone` Labs flag. Its rule keeps a number in E.164 (`+442079460000`) however it was written, after a + or the 00 most countries dial abroad with. It accepts only a number its country has given out, as libphonenumber-js's full metadata has them, and refuses one without its country code, one with anything else around it, and one with an extension.

  `phoneNumberIn(text, country)` reads a phone number the same way, as it is dialled in a country unless it was written with a country code of its own, and gives it in E.164, or undefined when it isn't a number a phone field could keep.

  `filterTextFor(leaf, typed, country)` is what a filter on a text leaf looks for: what was typed, as the leaf's field holds it. A phone field's filter then finds a number held in E.164 however it was written: a whole number in E.164, read in `country` unless it gives its code, and part of one as its digits.

  The `./phone` entry point, which a browser app can load without zod or libphonenumber-js, holds what a phone input beside a choice of country needs: what it starts from, shows and sends as someone types or picks a country (`startPhoneEntry`, `typeNumber`, `pickCountry`, `shownCountry`, `withCallingCode`), each country's calling code and way of dialling abroad (`CALLING_CODES`, `INTERNATIONAL_PREFIXES`), what tells apart the countries sharing a calling code (`SHARED_CODES`), `phoneCountryOptions`, `readCallingCode`, `phoneCountryOfLocales`, `isPhoneCountry` and `flagOf`.

- Renamed a text leaf's `size` to `format`, `TEXT_SIZES` to `TEXT_FORMATS` and `TextSize` to `TextFormat`. What sets a text leaf apart isn't always how much text it holds: a format can also be text in a particular shape, such as a phone number.

### Patch Changes

- Changed the README to point contributors at the package's new docs folder.
