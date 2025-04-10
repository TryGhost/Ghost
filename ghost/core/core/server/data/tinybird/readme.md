## Tinybird Analytics
This is the web analytics implementation using [Tinybird Forward](https://www.tinybird.co/docs/forward).

### Local
Run `yarn tb:local` from `/ghost/` to spin up a Docker container running Tinybird local.

In order to use `tb local` with Ghost, the config local blocks should be updated with your tokens: `tb token ls`.

Simply disable local to use the cloud version by switching `local: false` - this is switchable both via tracker script (ideally not used with the cloud data except with a unique id) and stats page.

### Config
Sample config:
```
    "tinybird": {
        "tracker": {
            "endpoint": "https://e.ghost.org/tb/web_analytics",
            "token": "xxxxx",
            "id": "local-ghost",
            "datasource": "analytics_events",
            "local": {
                "enabled": true,
                "token": "xxxxx",
                "endpoint": "http://localhost:7181/v0/events",
                "datasource": "analytics_events"
            }
        },
        "stats": {
            "endpoint": "https://api.tinybird.co",
            "token": "xxxxx",
            "id": "local-ghost",
            "local": {
                "enabled": true,
                "token": "xxxxx",
                "endpoint": "http://localhost:7181",
                "datasource": "analytics_events"
            }
        }
    }
```

### Testing
Tests are executed using `tb test run`.