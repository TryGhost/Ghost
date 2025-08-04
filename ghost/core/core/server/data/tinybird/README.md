## Tinybird Analytics

This is the web analytics implementation using [Tinybird Forward](https://www.tinybird.co/docs/forward).

### Requirements

In order to use Tinybird locally, make sure to install the Tinybird CLI.
**Only for the first time, run:** `yarn tb:install` from the root folder.

### Using Tinybird locally

To run Tinybird locally, run `yarn tb` from root. 

This script will pull and start the `tinybird-local` Docker container, then run `tb dev` to deploy the Tinybird project to the `tinybird-local` container on file changes. The `tb dev` command also launches a Tinybird shell environment where you can run other `tb` CLI commands against the local container.  Read more about the [`tb dev` command here](https://www.tinybird.co/docs/forward/dev-reference/commands/tb-dev).

### Connecting Tinybird to Ghost config file

In order to use Tinybird local service with Ghost, the config local needs to be updated with Tinybird details.
Config can contain information about remote and local environments.

Make sure to get the proper tokens, which you can obtain by running  `tb token ls`, or if you are within Tinybird
local shell environment, you can just run `token ls`.

Make sure you use the proper tokens. If you need read, write permissions, use a token that allows both.

Simply disable local to use the cloud version by switching `local: false`. 
This is switchable both via tracker script (ideally not used with the cloud data except with a unique id) and stats page.

You can enable or disable local in config script below. Update your `/ghost/core/config.local.json` or `/ghost/core/config.local.jsonc`
with the following information.

### Config
Sample config:
```jsonc
{
   "someOtherConfigurationForEmail": {
        "transport": "SMTP",
        "options": {
            "port": 12345
        }
    },
    "tinybird": {
        "workspaceId": "workspace-id-from-tinybird",
        "adminToken": "admin-token-from-tinybird",
        "tracker": {
            // -- needs to be present, and required Traffic Analytics service running with correct setup
            "endpoint": "http://localhost:3000/tb/web_analytics"
        },
        "stats": {
            //  -- optional override for site uuid
            // "id": "106a623d-9792-4b63-acde-4a0c28ead3dc",
            "endpoint": "https://api.tinybird.co",
            // -- tinybird local configuration (optional)
            "local": {
                "enabled": true,
                "token": "local-stats-or-admin-token",
            }
        }
    }
}
```

### Testing

Tests are executed using `test run` when running `tb dev`.


### Testing data

In fixtures folder, you can find local test data. When tinybird local is running, you can append data, or remove data
from fixture files here. As you modify the files, the datasources will be auto updated.

Keep in mind that as you update fixtures, it will rebuild data, but materialized views will have appended data. Old
data will not be cleared from them. One way to approach this to make sure data is consistent is to truncate all data
sources before adding test data to it.

### Architecture

[See full documentation regarding analytics architecture in following document](ARCHITECTURE.md)
