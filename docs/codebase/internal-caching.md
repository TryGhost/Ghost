# Internal Caching

Ghost supports internal cache adapters. They are configured in the `adapters`
section of the environment configuration:

```json
{
    "adapters": {
        "cache": {
            "active": "MemoryCache",
            "Redis": {
                "host": "localhost",
                "port": 6379,
                "password": ""
            },
            "imageSizes": {
                "adapter": "Redis",
                "keyPrefix": "2368:image-sizes:",
                "ttl": 30
            },
            "gscan": {}
        }
    }
}
```

The active adapter provides the default cache. A named feature uses the active
adapter unless its object includes an `adapter` override. Settings under the
adapter's class name are shared, and the feature object can override them.

Ghost includes `MemoryCache` and `Redis`. Current named caches include settings,
image sizes, theme validation, stats, and public post and tag data; use the name
requested by the owning service rather than inventing a second name in config.

Cache adapters must extend `@tryghost/adapter-base-cache` and implement `get`,
`set`, `reset`, and `keys`. See the
[`cache-base` README](../../packages/adapters/cache-base/README.md) for the
adapter contract and installation layout.
