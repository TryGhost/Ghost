# Configuration

Ghost Core uses `nconf` to combine defaults with environment-specific and local
configuration. This makes Ghost configurable across different environments and
allows developers to test code paths that are not suitable for a user-facing
Labs flag.

The loader and shared configuration live in
[`ghost/core/core/shared/config/`](../../ghost/core/core/shared/config/). Ghost
reads configuration when the process starts, so restart it after changing a
configuration file or environment variable.

For supported self-hosting options, see the
[public configuration reference](https://docs.ghost.org/config).

## Configuration precedence

When the same key appears in more than one place, Ghost uses the first value in
this list:

1. Internal overrides in `core/shared/config/overrides.json`
2. Command-line arguments
3. Secret files referenced by environment variables
4. Environment variables
5. `config.<NODE_ENV>.json` in `ghost/core/`
6. Docker development defaults when `GHOST_DEV_IS_DOCKER=true`
7. `config.local.json` in `ghost/core/`
8. `config.local.jsonc` in `ghost/core/`
9. Environment defaults in `core/shared/config/env/config.<NODE_ENV>.json`
10. Global defaults in `core/shared/config/defaults.json`

Internal overrides cannot be replaced by another configuration source.
`NODE_ENV` defaults to `development`. Environments whose names begin with
`testing` do not load the Docker or local configuration files.

## Developing locally

Create `ghost/core/config.local.json` for local overrides:

```json
{
    "logging": {
        "level": "debug"
    }
}
```

Use `config.local.jsonc` instead if comments are useful. If both local files
define the same key, `config.local.json` takes precedence. Do not modify the
tracked `config.development.json`, or commit credentials and local overrides.

The standard `pnpm dev` environment also supplies container connection values
as environment variables and loads
`core/shared/config/env/config.development.docker.json`. Environment variables
have higher precedence than local configuration files.

## Environment variables

Environment variable names match configuration keys, including case. Use two
underscores to represent a nested key:

```bash
logging__level=debug pnpm dev
```

Values are parsed, so use valid JSON syntax for arrays and objects:

```bash
logging__transports='["stdout"]' pnpm dev
```

To load a secret from a file, append `_FILE` to a nested configuration variable
and set its value to the file path:

```bash
database__connection__password_FILE=/run/secrets/db_password
```

Do not set both the normal variable and its `_FILE` form. Secret-file contents
remain strings rather than being parsed as JSON.

## Accessing configuration

Import the shared configuration instance and use colon-separated paths for
nested values:

```javascript
const config = require('../../shared/config');

const port = config.get('server:port');
const server = config.get('server');
```

`config.get('server')` returns a plain object, so read `server.port` rather than
calling `server.get('port')`.

Use the shared instance rather than creating another `nconf` provider. The
loader also normalizes paths and database configuration, validates the site URL,
and checks that the content path exists.

## Adding a configuration setting

Before adding a setting, search the defaults, environment files, and call sites
for an existing setting with the same purpose. Add new shared defaults to
[`defaults.json`](../../ghost/core/core/shared/config/defaults.json) so the
available configuration remains discoverable.

Use `camelCase` for new settings. Add focused tests when changing loading,
precedence, parsing, validation, or environment-specific behavior. The loader
tests live in
[`ghost/core/test/unit/shared/config/`](../../ghost/core/test/unit/shared/config/).

## Debugging

To print the resolved configuration while starting Ghost Core, enable its debug
namespace:

```bash
DEBUG=ghost:*,ghost-config pnpm dev
```

Resolved configuration can contain secrets. Only inspect it locally and never
paste unredacted output into issues or pull requests.
