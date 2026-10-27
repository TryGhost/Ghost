# Parse Email Address

Parse bare email addresses or named mailboxes, and format mailbox text.

## Usage

```javascript
import { parseEmailAddress } from '@tryghost/parse-email-address';

parseEmailAddress('foo@example.com');
// => {local: 'foo', domain: 'example.com'}

parseEmailAddress('invalid');
// => null

parseEmailAddress('foo@中文.example');
// => {local: 'foo', domain: 'xn--fiq228c.example'}
```

- Domain names must have at least two labels. `example.com` is okay, `example` is not.
- The top level domain must have at least two octets. `example.com` is okay, `example.x` is not.
- There are various length limits:
  - The whole email is limited to 986 octets, per SMTP.
  - Domain names are limited to 253 octets, per SMTP.
  - Domain labels are limited to 63 octets, per DNS.

## Mailboxes

The separate mailbox entry point parses one mailbox without validating its
address or normalizing its domain. Use it for display names and address text;
use `parseEmailAddress` when you need the existing validated local/domain parts
with an ASCII, lowercase domain.

```javascript
import { parseMailbox, formatMailbox } from '@tryghost/parse-email-address/mailbox';

parseMailbox('"Editor" <Local@中文.Example>');
// => {address: 'Local@中文.Example', name: 'Editor'}

parseMailbox('invalid');
// => {address: '', name: 'invalid'} — parsing is not address validation

parseMailbox('a@example.com, b@example.com');
// => null — lists and groups are unsupported

formatMailbox({address: 'Local@中文.Example', name: 'Editor ✅'});
// => '"Editor ✅" <Local@中文.Example>'
```

`parseMailbox` returns `null` for empty input, lists and groups. Comments follow
Nodemailer's address-parser behavior. Neither mailbox operation changes address
spelling. `formatMailbox` quotes and escapes display names, preserves their
Unicode and whitespace, and leaves the input object unchanged. Delivery-specific
compatibility rules belong in the caller's mail adapter.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm bootstrap` to install top-level dependencies.

## Test

- `pnpm build` compiles the library
- `pnpm test` runs unit tests and typechecks
- `pnpm lint` runs ESLint
