# Translating Ghost

Ghost can be translated into many languages. Translations cover Ghost's public
apps, parts of Ghost Core, and emails sent to members.

Ghost uses [i18next](https://www.i18next.com/) and keeps translations in
[`packages/i18n/locales/`](../../packages/i18n/locales/). Each language has its
own folder containing separate JSON files for Ghost, Portal, Comments, Signup
form, and Search.

Within each file, the key on the left is the original English string and the
value on the right is its translation. An empty value falls back to the English
string.

## Translating existing strings

1. Find your language in `packages/i18n/locales/`.
2. Open the JSON file for the part of Ghost you want to translate:

   | File | Where the translation appears |
   | --- | --- |
   | `ghost.json` | Ghost Core and emails |
   | `portal.json` | Portal |
   | `comments.json` | Comments |
   | `signup-form.json` | Signup form |
   | `search.json` | Search |

3. Add or improve the translated values. Leave the English keys unchanged.
4. Run the translation checks from the repository root:

   ```bash
   pnpm --filter @tryghost/i18n lint:translations
   ```

5. Commit the changes and open a pull request following the
   [contribution workflow](workflow.md).

Keep every `{variable}` and `<tag>` from the English string in the translation.
The words around them can move to suit the language, but their names and
spelling must not change.

```json
{
    "Welcome back, {name}!": "Bon retour, {name} !"
}
```

Translate the meaning of the complete message rather than translating each word
literally. The description for a string in
[`packages/i18n/locales/context.json`](../../packages/i18n/locales/context.json)
explains where it appears and what it is intended to communicate.

## Adding a language

Before starting a new language, open an issue or discussion so the locale code
and scope can be agreed. Ghost supports base languages as well as some regional
and script variants.

To add an agreed language:

1. Add its code and English label to
   [`packages/i18n/lib/locale-data.json`](../../packages/i18n/lib/locale-data.json).
2. From the repository root, run:

   ```bash
   pnpm --filter @tryghost/i18n translate
   ```

3. Translate the generated files in `packages/i18n/locales/<locale>/`.
4. Run the translation checks and package tests:

   ```bash
   pnpm --filter @tryghost/i18n lint:translations
   pnpm --filter @tryghost/i18n test
   ```

5. Commit the locale metadata and translation files together, then open a pull
   request.

## Adding product copy

If you are adding or changing translatable strings in the code, see the
[internationalization guide](../practices/internationalization.md). It covers
translation helpers, extraction, interpolation, context, and CI checks.
