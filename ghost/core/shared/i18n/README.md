# Ghost Core translation facade

This directory owns the publication translator and its locale-change wiring.
The translation engine and the locale catalogues stay in `packages/i18n/`.

It lives in `shared/` beside the settings cache and labs because, like them, it
is Ghost-specific configured state that the rest of the server reads. Its
eventual owner is the same as theirs, whatever the settings module becomes.

## Contracts

- The exports are `init`, `t`, `dir` and `changeLanguage`. No instance, reset
  or shutdown is exposed.
- `t`, `dir` and `changeLanguage` delegate to the current translator and assert
  that one exists. They can be destructured and kept before `init`; calling them
  before it throws.
- Boot calls `init({ events })` once, after settings are ready and before the
  frontend services. It reads the locale from the settings cache, falling back
  to `en`, creates a `ghost` namespace translator and subscribes to
  `settings.locale.edited` on the bus it was given. Shared code may not require
  the server's event bus, so boot supplies it.
- A repeated `init` replaces the translator and removes the previous listener,
  so there is only ever one. A kept `t` or `dir` follows the replacement.
- `changeLanguage` resolves to the library's own translator, bound to that
  instance. Unlike the exported `t`, it does not follow a later `init`.
- The locale listener neither catches errors nor awaits `changeLanguage`.
  Settings edits reach it through the model event layer, after the transaction
  commits.
- Email-service, member welcome emails and the theme engine build their own
  translators. Changing this one does not change them.

Still untested: a persisted settings edit reaching the listener end to end,
failures after the translator is published, and listener counts across a
same-process stop and reboot. The full audit from before the move is in the
[service inventory at that revision](https://github.com/TryGhost/Ghost/blob/707fc5e5ac73882415089c2c61765eb30756e522/ghost/core/server/services/service-inventory.yaml#L4650).

## Tests

From `ghost/`, run the facade and translation-consumer tests:

```sh
pnpm exec vitest run \
  test/unit/shared/i18n.test.ts \
  test/unit/boot/init-core.test.ts \
  test/unit/server/services/stripe/stripe-api.test.js \
  test/unit/server/services/members/members-api/services/payments-service.test.js \
  test/unit/server/web/gift-preview/controller.test.js
```
