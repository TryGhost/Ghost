# Ghost config reference

<!-- Generated from core/shared/config/schema.ts by `pnpm --filter ghost config:reference`. Do not edit by hand. -->

Ghost reads config from `config.production.json` in the install directory, then from environment variables. Nest keys in JSON as they're written below; in an environment variable, join them with `__`.

Defaults are what a production install gets with nothing set. Keys Ghost sets itself, which config can't change, are left out. This page lists only keys that have a schema so far; Ghost reads others too.

## `url`

The site's public URL, including protocol. A path is a subdirectory install.

- Type: string
- Default: `"http://localhost:2368"`
- Examples: `"https://example.com"`, `"https://example.com/blog"`, `"http://localhost:2368"`
- Environment variable: `url`

## `paths`

### `paths.contentPath`

The site's content directory: themes, images, adapters, settings. The one path a self-hoster normally sets.

- Type: string
- Default: `"content/"`
- Examples: `"/var/www/ghost/content"`
- Environment variable: `paths__contentPath`

### `paths.assetSrc`

Frontend asset sources.

- Type: string
- Default: `"core/frontend/src"`
- Environment variable: `paths__assetSrc`

### `paths.installedAdaptersPath`

Extra adapter lookup path, for images that install adapters outside content/.

- Type: string
- Environment variable: `paths__installedAdaptersPath`

### `paths.fixtures`

Fixture data loaded on a fresh install.

- Type: string
- Default: `"core/server/data/schema/fixtures/fixtures"`
- Environment variable: `paths__fixtures`

### `paths.defaultSettings`

Default settings loaded on a fresh install.

- Type: string
- Default: `"core/server/data/schema/default-settings/default-settings"`
- Environment variable: `paths__defaultSettings`

## `database`

Database connection. `mysql` and `sqlite3` are accepted as aliases for their driver names.

One of these shapes, chosen by `database.client`: `"mysql"`, `"mysql2"`, `"sqlite3"`, `"better-sqlite3"`.

### `database.pool`

knex's connection pool.

Keys not listed here are passed through unchanged.

Example: `{"min":0,"max":5}`

#### `database.pool.min`

- Type: number
- Environment variable: `database__pool__min`

#### `database.pool.max`

- Type: number
- Environment variable: `database__pool__max`

### `database.debug`

Log every query knex runs.

- Type: boolean
- Environment variable: `database__debug`

### `database.useNullAsDefault`

Insert NULL for a column a row omits. SQLite only.

- Type: boolean
- Environment variable: `database__useNullAsDefault`

### When `client` is `"mysql"` or `"mysql2"`

#### `database.connection`

Passed to the mysql2 driver. See https://sidorares.github.io/node-mysql2/docs/api-and-configurations

Keys not listed here are passed through unchanged.

##### `database.connection.host`

- Type: string
- Default: `"127.0.0.1"`
- Examples: `"127.0.0.1"`
- Environment variable: `database__connection__host`

##### `database.connection.port`

- Type: number \| string
- Environment variable: `database__connection__port`

##### `database.connection.user`

- Type: string
- Default: `"root"`
- Environment variable: `database__connection__user`

##### `database.connection.password`

- Type: string
- Default: `""`
- Environment variable: `database__connection__password`

##### `database.connection.database`

- Type: string
- Default: `"ghost"`
- Environment variable: `database__connection__database`

##### `database.connection.charset`

- Type: string
- Environment variable: `database__connection__charset`

##### `database.connection.ssl`

- Type: `false` \| string \| object
- Environment variable: `database__connection__ssl`

### When `client` is `"sqlite3"` or `"better-sqlite3"`

#### `database.connection`

##### `database.connection.filename`

The SQLite database file.

- Type: string
- Examples: `"/var/www/ghost/content/data/ghost.db"`
- Environment variable: `database__connection__filename`

## `auth`

### `auth.engine`

Staff authentication engine. `better-auth` is in development and needs MySQL and the in-development auth tables.

- Type: `"legacy"` \| `"better-auth"`
- Default: `"legacy"`
- Examples: `"legacy"`, `"better-auth"`
- Environment variable: `auth__engine`

## `explore`

Ghost Explore, the directory of Ghost sites.

### `explore.update_url`

Where the site sends its Explore ping. Pinging is skipped when unset.

- Type: string
- Default: `"https://explore.ghost.org/api/update"`
- Examples: `"https://explore.ghost.org/api/update"`
- Environment variable: `explore__update_url`

### `explore.testimonials_url`

Explore testimonials endpoint, passed to Admin through the public config.

- Type: string
- Default: `"https://explore.ghost.org/api/testimonials"`
- Examples: `"https://explore.ghost.org/api/testimonials"`
- Environment variable: `explore__testimonials_url`
