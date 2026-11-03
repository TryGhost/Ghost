## 2.0.0

### Major Changes

- Removed the UMD/CommonJS build; the package is now ESM-only. `main` and the package's `.` export point at `dist/koenig-lexical.js`, and `dist/koenig-lexical.umd.js` is no longer published. Import the editor as an ES module and its styles from `@tryghost/koenig-lexical/style.css`.

### Minor Changes

- Added alt text support for the product card image: a productImageAlt property on the product node, rendered as the image's alt attribute on web and email, parsed from HTML on import, and editable from an Alt toggle on the card in the editor

- Added `SelectionWordCountPlugin`, which reports the word count of the current selection, including selections inside nested editors such as captions, or `null` while nothing is selected, so an editor can show "X of Y words"

### Patch Changes

- Updated dependencies

- Updated dependencies

- Removed the emoji picker's custom element registry fallback for duplicate editor bundles

- Updated dependencies

- Fixed the image card offering editing and width options for GIFs whose URL has a query string, fragment or uppercase extension

- Updated dependencies

- Updated dependencies

- Removed the drag auto-scroll fallback to a legacy Admin editor container

- Updated dependencies

- Updated dependencies
