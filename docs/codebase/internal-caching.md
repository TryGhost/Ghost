# Internal Caching

Ghost supports internal cache adapters. They are configured in the `adapters`
section of the environment configuration:

```json
{
    "adapters": {
        "cache": {
            "active": "Memory",
            "settings": {
                "adapter": "SyncInMemory"
            },
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
            "urls": {
                "adapter": "Redis",
                "keyPrefix": "2368:urls:"
            },
            "analytics": {
                "adapter": "Redis",
                "keyPrefix": "2368:analytics:"
            }
        }
    }
}
```

The active adapter provides the default cache. Named entries allow individual
features to use a different adapter and settings.
