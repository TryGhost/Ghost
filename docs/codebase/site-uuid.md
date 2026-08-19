# Site UUID

Each Ghost site has a `site_uuid` in its settings table. It is a unique site
identifier exposed by Ghost's public site configuration. Ghost uses it to keep
site data separate when talking to services such as Tinybird.

## Generation

When the setting is first created, Ghost uses the configured `site_uuid` when it
is a valid UUID. Otherwise it generates a random UUID. The value is normalized
to lowercase before it is stored.

The value is immutable. It cannot be changed through the Admin API or a JSON
import. To choose it, configure `site_uuid` before the site's first boot.

On later boots, Ghost compares a configured `site_uuid` with the stored setting.
If they differ, Ghost stops with a `SITE_UUID_MISMATCH` error to prevent the site
from running under the wrong identity.

## Usage

Read the stored value inside Ghost with:

```js
settingsCache.get('site_uuid')
```

Generation is implemented in
[`settings-utils.js`](../../ghost/core/core/server/services/settings/settings-utils.js),
and the boot-time check is in
[`settings-service.js`](../../ghost/core/core/server/services/settings/settings-service.js).
