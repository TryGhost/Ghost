# NQL String

Build [NQL](https://github.com/TryGhost/NQL) filters as strings: escape values for safe
embedding, and combine filters without changing what each one means.

## Usage

```javascript
escapeNqlString('can\'t stop');
// => "'can\\'t stop'"

`title:~${escapeNqlString(searchTerm)}`
```

The return value includes the surrounding quotes, so interpolate it directly
rather than adding your own.

```javascript
allOf('status:free,status:-free', 'label:vip');
// => '(status:free,status:-free)+(label:vip)'
```

`allOf` skips parts that are `undefined` and returns `undefined` when none are
left, which means no condition at all.

## Why this exists

NQL delimits string values with quotes, so any value reaching a filter
unescaped can terminate the string literal early and break the parser — a URL
with a trailing `'`, or a post title containing `"`, is enough to make a filter
unparseable.

Two escaping rules are easy to get wrong, which is why this is shared rather
than reimplemented per app:

- **Both quote characters must be escaped**, not just the delimiter. The lexer
  rejects a bare `"` inside a single-quoted string.
- **Backslashes must not be escaped.** NQL's only escape sequences are `\'` and
  `\"` — there is no `\\` — so a lone backslash is a literal character and
  doubling it would query a different value.

The value must be non-empty: NQL's string rule requires at least one character.

Combining filters by hand is easy to get wrong too. `+` binds tighter than `,`,
so joining `status:free,status:-free` and `label:vip` with a bare `+` matches
every free member. `allOf` brackets every part. Each part must be a valid filter
on its own: a part with an unmatched bracket closes the bracket around it.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm` to install top-level dependencies.

## Test

- `pnpm lint` run eslint
- `pnpm test` run the unit tests and typecheck
