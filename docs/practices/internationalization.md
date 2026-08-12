# Internationalization

Ghost keeps translatable product copy in `packages/i18n`. English strings are
the source for every supported locale, and the translation tooling extracts
those strings from the apps and Ghost Core.

## Translation namespaces

Translation files live at
`packages/i18n/locales/<locale>/<namespace>.json`. Each part of Ghost uses its
own namespace:

| Namespace | Source |
| --- | --- |
| `ghost` | Ghost Core, including server and frontend email templates |
| `portal` | Portal |
| `signup-form` | Signup form |
| `comments` | Comments |
| `search` | Search |

The list of supported locales is in
`packages/i18n/lib/locale-data.json`. Each namespace has the same set of locale
files.

## Adding or changing copy

Write the English message in the source code using that app's `t()` helper,
then update the translation files from the repository root:

```bash
pnpm --filter @tryghost/i18n translate
```

The command extracts source messages, updates every locale file, and updates
`packages/i18n/locales/context.json`. Add a useful description for every new
entry in `context.json` so translators know where the message appears and what
it means. CI rejects missing messages and empty context descriptions.

Commit the source change, generated locale changes, and context changes
together.

## Writing translatable messages

Keep a complete sentence in one translation call. Translators need the whole
message so they can change its word order.

```jsx
// Do
t('Could not sign in. Please try again.')

// Do not split one sentence across calls
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

Do not build a sentence from translated fragments. Apart from making word order
fixed, fragments make the translator's context unclear.

When editing translated values directly, preserve every `{variable}` and
`<tag>` from the English message. Their names and spelling are part of the
runtime contract.

## Checking changes

Run the translation checks from the repository root:

```bash
pnpm --filter @tryghost/i18n lint:translations
pnpm --filter @tryghost/i18n test
```

The linter checks that translations use the variables defined by their English
message. The package tests also run extraction, so check the resulting diff and
commit any expected generated changes.
