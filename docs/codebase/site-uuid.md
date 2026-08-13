# Site UUID

Each Ghost site has a `site_uuid` in its settings table. It is a unique site
identifier which is safe to expose publicly. It is used when Ghost talks to
shared services such as Tinybird, where records need to be associated with the
correct site.

## Generation

On first boot, Ghost uses the configured `site_uuid` when it is a valid UUID.
Otherwise it generates a random UUID. The resulting value is stored as the
`site_uuid` setting.

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
