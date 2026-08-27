# Internationalization

Use Ghost's internationalization system for product copy that appears in a
supported translatable surface. The shared `packages/i18n` package extracts
English source strings and provides locale resources to Ghost Core and the
public apps.

For contributing translations or adding a language, see
[Translating Ghost](../contributing/translating-ghost.md).

## Namespaces

Translation files live at
`packages/i18n/locales/<locale>/<namespace>.json`. The extraction scripts define
five namespaces:

| Namespace     | Source                                                             |
| ------------- | ------------------------------------------------------------------ |
| `ghost`       | Ghost Core, including server, frontend, and member email templates |
| `portal`      | Portal                                                             |
| `comments`    | Comments                                                           |
| `signup-form` | Signup form                                                        |
| `search`      | Search                                                             |

The English string passed to `t()` is the translation key. English locale values
are empty so i18next falls back to that key.

## Writing translatable copy

Import and use the `t()` helper established by the app or service you are
changing. Keep a complete sentence in one translation call so translators can
change its word order.

```jsx
// Do
t('Could not sign in. Please try again.')

// Do not split one message across translation calls
t('Could not sign in.') + ' ' + t('Please try again.')
```

Use named variables for dynamic values:

```jsx
t('Welcome back, {name}!', {name: member.name})
```

When a message contains a link, button, or other element, keep the full message
in one string and use `@doist/react-interpolate`:

```jsx
import Interpolate from '@doist/react-interpolate';

<Interpolate
    mapping={{a: <a href={helpUrl} />}}
    string={t('Having trouble? <a>Read the help guide</a>.')}
/>
```

Do not build a sentence from translated fragments. Preserve the names of
`{variables}` and `<tags>`: they form part of the runtime contract and are
validated across locales.

## Extracting strings

After adding or changing a source string, run from the repository root:

```bash
pnpm --filter @tryghost/i18n translate
```

This extracts source strings, updates all locale files, and synchronizes
`packages/i18n/locales/context.json`. Add a useful description for each new
entry in `context.json` so translators know where the message appears and what
it means. CI rejects extraction changes and empty context descriptions.

Commit the source change, generated locale changes, and context changes
together.

## Checking changes

Run the package checks from the repository root:

```bash
pnpm --filter @tryghost/i18n lint:translations
pnpm --filter @tryghost/i18n test
```

The translation linter checks that locale values use the variables defined by
their English message. The package tests also run extraction, so review the
resulting diff and commit any expected generated changes.
