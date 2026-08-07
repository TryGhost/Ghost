# Parse Email Address

Extract the local and domain parts of email address strings.

## Usage

```javascript
import {parseEmailAddress} from '@tryghost/parse-email-address';

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

## Develop

This is a private workspace package in the Ghost monorepo. From the repository
root:

```bash
pnpm --filter @tryghost/parse-email-address build
pnpm --filter @tryghost/parse-email-address test
pnpm --filter @tryghost/parse-email-address lint
```
