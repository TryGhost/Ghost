## 1.5.5

### Patch Changes

- Fixed rendering of invalid heading tags, list starts and card visibility settings. A heading whose tag isn't a heading tag renders as `h2`, a list start that isn't a whole number is left out, and a card with an unrecognised web visibility setting is hidden.

- Updated dependencies:
  - @tryghost/kg-default-nodes@2.4.0
