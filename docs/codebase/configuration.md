# Configuration

Ghost Core loads configuration through `nconf`. This guide explains the
configuration contract for people changing or running the codebase. For the
supported self-hosting options, see the
[public configuration reference](https://docs.ghost.org/config).

The loader lives in
[`ghost/core/core/shared/config/`](../../ghost/core/core/shared/config/). Ghost
reads configuration when the process starts, so restart the development server
after changing a configuration file or environment variable.

## Configuration precedence

When the same key appears in more than one place, Ghost uses the first value in
this list:

1. Internal overrides in `core/shared/config/overrides.json`
2. Command-line arguments
3. Environment variables
4. `config.<NODE_ENV>.json` in `ghost/core/`
5. Docker development defaults when `GHOST_DEV_IS_DOCKER=true`
6. `config.local.json` in `ghost/core/`
7. `config.local.jsonc` in `ghost/core/`
8. Environment defaults in `core/shared/config/env/config.<NODE_ENV>.json`
9. Global defaults in `core/shared/config/defaults.json`

Internal overrides cannot be replaced by another configuration source. Avoid
using command-line arguments for persistent configuration; files and environment
variables are easier to reproduce.

`NODE_ENV` defaults to `development`. The test environments do not load the
local JSON or JSONC files.

## Local development

Create `ghost/core/config.local.json` for local overrides:

```json
{
    "logging": {
        "level": "debug"
    }
}
```

The repository ignores `config.*.json` and `config.*.jsonc` files in
`ghost/core/` unless they are already tracked. Do not commit local credentials
or overrides.

Use `config.local.jsonc` instead when comments are useful. If both local files
define the same key, `config.local.json` takes precedence.

The standard `pnpm dev` environment supplies container connection values as
environment variables and also loads
`core/shared/config/env/config.development.docker.json`. Because environment
variables have higher precedence, a value supplied by Docker Compose cannot be
replaced in a local configuration file.

## Environment variables

Environment variable names match configuration keys exactly, including case.
Use two underscores to represent a nested key:

```bash
logging__level=debug pnpm dev
```

Values are parsed rather than treated only as strings. Use valid JSON syntax for
arrays and objects:

```bash
logging__transports='["stdout"]' pnpm dev
```

Prefer environment variables for values supplied by the runtime, especially
secrets. Never commit secrets to a configuration file.

## Reading configuration in code

Import the shared configuration instance and use colon-separated paths for
nested values:

```javascript
const config = require('../../shared/config');

const port = config.get('server:port');
const server = config.get('server');
```

`config.get('server')` returns a plain object, so read `server.port` rather than
calling `server.get('port')`.

Use the existing configuration instance rather than creating another `nconf`
provider. This preserves the repository's precedence, path normalization, URL
validation, and database normalization behavior.

## Adding a configuration key

Before adding a key, search the defaults, environment files, and call sites for
an existing setting with the same purpose. New shared defaults belong in
[`defaults.json`](../../ghost/core/core/shared/config/defaults.json) so the
available configuration remains discoverable.

Use `camelCase` for new keys. Add focused tests when the change affects loading,
precedence, parsing, validation, or environment-specific behavior. The loader
tests live in
[`ghost/core/test/unit/shared/config/`](../../ghost/core/test/unit/shared/config/).

Keep private deployment mechanics out of this repository. This guide documents
the public, code-visible configuration contract; environment-specific operations
belong in the system that owns that deployment.

## Debugging

To print the resolved configuration while starting Ghost Core, enable the
configuration debug namespace:

```bash
DEBUG=ghost:*,ghost-config pnpm dev
```

The resolved output can contain secrets. Use it only in a local environment and
do not paste unredacted output into issues, pull requests, or logs.

If Ghost rejects a configuration change, check that:

- `url` includes `http://` or `https://`
- `paths.contentPath` exists
- nested environment variables use `__`
- environment-variable names use the same case as their configuration keys
- JSON files contain valid JSON, or comments are placed in the JSONC file
