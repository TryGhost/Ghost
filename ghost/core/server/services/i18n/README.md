# Ghost Core translation service

This directory owns the server translation facade and its locale-change wiring.
The translation implementation and resources remain in `packages/i18n/`.

Boot awaits `init()`, which creates one translator for the current settings-cache
locale and subscribes to `settings.locale.edited`. The ready translator is
exposed as `.service`; reading it before `init()` throws. Callers keep the root
and read `.service.t`, `.service.dir` or `.service.changeLanguage` at use time
rather than capturing the translator during import. Repeated `init()` calls
retain the same translator and listener.

From `ghost/`, run the root, boot and translation-consumer tests:

```sh
pnpm exec vitest run \
  test/unit/server/services/i18n/index.test.ts \
  test/unit/boot/init-core.test.ts \
  test/unit/server/services/stripe/stripe-api.test.js \
  test/unit/server/services/members/members-api/services/payments-service.test.js \
  test/unit/server/web/gift-preview/controller.test.js
```
