# Translating Ghost

Ghost has support for translating strings in Portal and emails. Under the hood,
we use [i18next](https://github.com/i18next/i18next) and
[i18next-parser](https://github.com/i18next/i18next-parser), so be sure to read
their [docs](https://www.i18next.com/) if you have questions about the tooling.

All translations are stored within the
[`i18n`](https://github.com/TryGhost/Ghost/tree/main/ghost/i18n) package in the
Ghost monorepo. The
[`locales`](https://github.com/TryGhost/Ghost/tree/main/ghost/i18n/locales)
folder contains the languages we currently have configured, and each subfolder
contains the translations in a JSON file, separated by the project they're for.
For example, `portal.json` contains Portal-specific strings, and `test.json` is
just for testing purposes.

Within a JSON file, you'll see a key-value pair of strings. The key (the
left-hand side of the colon) is what we use in code. If the value (the
right-hand side of the colon) is `""`, the string has not yet been translated
and we default back to the key.

## Translating strings

If you'd like to translate a string, open up a JSON file within
[`ghost/i18n/locales`](https://github.com/TryGhost/Ghost/tree/main/ghost/i18n/locales)
and start writing.

Keep in mind:

- If the string contains curly braces—e.g. `{{something}}`—it's a variable in
  the code, so we need to keep that in the translated string.

Once you're done, commit the changes and open a pull request on the Ghost repo
so the team can review and merge it 🎉

Be sure to follow our
[contributing guide](https://github.com/TryGhost/Ghost/blob/main/.github/CONTRIBUTING.md)
when opening a pull request, particularly the part about commit messages. Please
do `refs https://github.com/TryGhost/Team/issues/2795` on the third line.

## Adding a new language

> We only support **ISO 639-1** language codes, listed
> [here](https://www.w3schools.com/tags/ref_language_codes.asp).

1. Add the language code to the
   [list of supported locales](https://github.com/TryGhost/Ghost/blob/1c9327ce33d730232a497c9fcecfae78d8c1ece2/ghost/i18n/lib/i18n.js#L3).
2. Inside `ghost/i18n`, run `yarn translate`. A new folder for your locale will
   be created inside `ghost/i18n/locales`.
3. Commit the new changes and open a pull request on the Ghost repo so the team
   can review and merge it 🎉

## Translating a new string

To translate a new string, you'll need to wrap it in the translate helper. In
Portal, we pass this around in the `AppContext` as `t`. Here is a
[link to existing uses of the translation helper within Portal](https://github.com/search?q=repo%3ATryGhost%2FGhost+%7Bt%28%27+path%3A%2F%5Eghost%5C%2Fportal%5C%2F%2F&type=code),
so you get an idea:

1. Ensure you have access to the `t` function by importing it from the
   `AppContext`.
2. Wrap your string in it, e.g. `{t('Hello world')}`.
3. Add this to the JSON translation files by running `yarn translate` inside
   `ghost/i18n`.
4. Translate the string in all locales, if applicable.
5. Commit the new changes using the following format:

   ```text
   🌐 Updated/Added [Language] translations for [Component]

   - [Any specific details about why this particular change is the right change]
   ```

   Real example:

   ```text
   🌐 Updated Spanish translations for Newsletter

   - This translates the email newsletter CTA into Spanish.
   - Other tweaks improve the accuracy of the translations, making them feel more natural
   ```

6. Open a pull request on the Ghost repo so the team can review and merge it 🎉
