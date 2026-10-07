## 1.11.1

### Patch Changes

- Reported embed renderer load failures to the editor's `onError` handler

- Fixed the photographer link in Unsplash photo credits missing Unsplash's referral parameters

- Fixed the Unsplash selector's like and download links sending malformed referral and download parameters

- Fixed acceptance tests reusing the Admin development server by using an isolated, configurable demo port with strict startup

- Fixed the editor freezing on embed previews when the browser shows scrollbars that take up space

- Changed the markdown toolbar's disabled buttons to use Koenig's own grey instead of a Ghost Admin stylesheet variable

- Embed previews now render when the embed renderer answers after the timeout, instead of staying unavailable

- Updated dependencies

- Updated dependencies

- Fixed the Unsplash selector's close and Insert buttons not working from the keyboard, and Escape closing the selector instead of a zoomed photo

- Removed Ember colour dependencies from Markdown editor toolbar and selection styles, with consistent full-height highlights and no selected-text underlines

- Fixed editor errors when selections, cards, or DOM elements are no longer available.

- Updated dependencies

- Updated dependencies

- Updated dependencies
