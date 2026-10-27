# Ghost Core translation service

This directory owns the server translation facade and its locale-change wiring.
The translation implementation and resources remain in `packages/i18n/`.
Existing callers keep importing `core/server/services/i18n`.

Boot calls `init()` to create a translator for the current settings-cache locale
and subscribe to `settings.locale.edited`. The `t`, `dir` and `changeLanguage`
exports delegate to that translator and assert that it exists before use.
Repeated initialization currently replaces the translator and adds another
listener. This move preserves those behaviours; it does not adopt a new
initializer or add listener disposal.

From `ghost/`, run the boot and translation-consumer tests:

```sh
pnpm exec vitest run \
  test/unit/boot-signing-keys.test.ts \
  test/unit/server/services/stripe/stripe-api.test.js \
  test/unit/server/services/members/members-api/services/payments-service.test.js \
  test/unit/server/web/gift-preview/controller.test.js
```
