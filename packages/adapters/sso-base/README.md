# @tryghost/adapter-base-sso

Base class for Ghost SSO adapters. An SSO adapter lets an external identity
provider sign users in to Ghost admin: it reads credentials off the incoming
request, resolves them to an identity, and maps that identity to a Ghost user.

See the [Ghost adapters documentation](https://docs.ghost.org/config#adapters)
for how adapters are configured and loaded.

## Usage

Install the base class alongside your adapter:

```bash
npm install @tryghost/adapter-base-sso
```

Extend `SSOBase` and implement every method listed in `requiredFns`:

- `getRequestCredentials(request)` — pull the credentials (token, cookie, ...)
  off the incoming Express request, or return `null` if none are present.
- `getIdentityFromCredentials(credentials)` — validate the credentials and
  resolve them to an identity, or `null`.
- `getUserForIdentity(identity)` — map the identity to a Ghost user, or `null`.

Ghost injects a user repository after constructing the adapter, exposed through
the protected `getUserByEmail(email)` and `getOwnerUser()` helpers — use these
to resolve Ghost users without reaching into Ghost's model layer directly.

```js
const {SSOBase} = require('@tryghost/adapter-base-sso');

class MySSO extends SSOBase {
    async getRequestCredentials(request) {
        const token = request.get('authorization');
        return token ?? null;
    }

    async getIdentityFromCredentials(token) {
        return this.verify(token); // your validation → identity, or null
    }

    async getUserForIdentity(identity) {
        // `getUserByEmail` is provided by the base class
        return this.getUserByEmail(identity.email);
    }
}

module.exports = MySSO;
```

### Installing and activating

Place the adapter at `content/adapters/sso/MySSO/index.js` and activate it in
your Ghost config:

```json
{
    "adapters": {
        "sso": {
            "active": "MySSO",
            "MySSO": {}
        }
    }
}
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/adapter-base-sso build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/adapter-base-sso test    # type-check + unit tests
pnpm --filter @tryghost/adapter-base-sso dev     # rebuild on change
```

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
