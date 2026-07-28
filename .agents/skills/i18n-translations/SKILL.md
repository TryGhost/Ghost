---
name: i18n-translations
description: Add or change translatable strings in Ghost. Use when editing `t()` calls, adding translation keys, working with `packages/i18n`, or touching user-facing copy in admin or public apps.
---

# i18n Architecture

**Centralized Translations:**
- Single source: `packages/i18n/locales/{locale}/{namespace}.json`
- Namespaces: `ghost`, `portal`, `signup-form`, `comments`, `search`
- 60+ supported locales
- Context descriptions: `packages/i18n/locales/context.json` — every key must have a non-empty description

**Translation Workflow:**
```bash
pnpm --filter @tryghost/i18n translate          # Extract keys from source, update all locale files + context.json
pnpm --filter @tryghost/i18n lint:translations   # Validate interpolation variables across locales
```

`translate` is run as part of `pnpm --filter @tryghost/i18n test`. In CI, it fails if translation keys or `context.json` are out of date (`failOnUpdate: process.env.CI`). Always run `pnpm --filter @tryghost/i18n translate` after adding or changing `t()` calls.

**Rules for Translation Keys:**
1. **Never split sentences across multiple `t()` calls.** Translators cannot reorder words across separate keys. Instead, use `@doist/react-interpolate` to embed React elements (links, bold, etc.) within a single translatable string.
2. **Always provide context descriptions.** When adding a new key, add a description in `context.json` explaining where the string appears and what it does. CI will reject empty descriptions.
3. **Use interpolation for dynamic values.** Ghost uses `{variable}` syntax: `t('Welcome back, {name}!', {name: firstname})`
4. **Use `<tag>` syntax for inline elements.** Combined with `@doist/react-interpolate`: `t('Click <a>here</a> to retry')` with `mapping={{ a: <a href="..." /> }}`

**Correct pattern (using Interpolate):**
```jsx
import Interpolate from '@doist/react-interpolate';

<Interpolate
    mapping={{ a: <a href={link} /> }}
    string={t('Could not sign in. <a>Click here to retry</a>')}
/>
```

**Incorrect pattern (split sentences):**
```jsx
// BAD: translators cannot reorder "Click here to retry" relative to the first sentence
{t('Could not sign in.')} <a href={link}>{t('Click here to retry')}</a>
```

See `apps/portal/src/components/pages/email-receiving-faq.js` for a canonical example of correct `Interpolate` usage.

## Where translations go

- **Admin UI:** add to `packages/i18n/locales/en/ghost.json`
- **Public apps:** separate namespaces (`portal.json`, `comments.json`)
