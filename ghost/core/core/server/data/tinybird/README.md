## Tinybird Analytics

This is the web analytics implementation using [Tinybird Forward](https://www.tinybird.co/docs/forward).


### Using Tinybird with Docker (Recommended)

The easiest way to run Tinybird with Ghost locally is to use Docker and Docker Compose. This is the recommended approach because it requires zero additional configuration and avoids the need to install the Tinybird CLI on your machine. You'll need to have Docker and Docker Compose installed on your machine.

All of these commands should be run from the root of the Ghost repository:

1. `docker compose --profile analytics up -d` - This will start the Tinybird local container, deploy the datafiles in this directory to it, and configure + start the Analytics service.
1. `docker compose --profile split up` - This will start the Ghost service and configure it to use the bundled Tinybird & Analytics services automatically.

Ghost will be accessible at `http://localhost:2368`, and analytics should work out of the box.

#### Using the Tinybird CLI from Docker
Following the above steps will deploy the Tinybird datafiles to the local Tinybird instance. If you want to use the Tinybird CLI without installing it on your machine, you can use the `tb` docker compose service to run a one-off command or initiate a shell session.

To run a one-off command, use the following command:
```bash
docker compose run --rm -it tb-cli tb <command>
```

For example, to list all tokens, you can run:
```bash
docker compose run --rm -it tb-cli tb token ls
```

To start a persistent shell session with `tb dev`, which will continuously watch for changes in the data files and automatically deploy them, you can run:
```bash
docker compose run --rm -it tb-cli tb dev
```

### Using Tinybird locally

#### Requirements

In order to use Tinybird locally, make sure to install the Tinybird CLI.
**Only for the first time, run:** `yarn tb:install` from the root folder.

To run Tinybird locally, run `yarn tb` from root. 

#### Connecting Tinybird to Ghost config file

In order to use Tinybird local service with Ghost, the config local needs to be updated with Tinybird details.
Config can contain information about remote and local environments.

Make sure to get the proper tokens, which you can obtain by running  `tb token ls`, or if you are within Tinybird
local shell environment, you can just run `token ls`.

Make sure you use the proper tokens. If you need read, write permissions, use a token that allows both.

Simply disable local to use the cloud version by switching `local: false`. 
This is switchable both via tracker script (ideally not used with the cloud data except with a unique id) and stats page.

You can enable or disable local in config script below. Update your `/ghost/core/config.local.json` or `/ghost/core/config.local.jsonc`
with the following information.

#### Config
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
            "endpoint": "http://localhost:3000/api/v1/page_hit"
        },
        "stats": {
            //  -- optional override for site uuid
            // "id": "106a623d-9792-4b63-acde-4a0c28ead3dc",
            "endpoint": "https://api.tinybird.co",
            // -- optional endpoint version suffix (e.g., "v2" calls api_kpis_v2 instead of api_kpis)
            // "version": "v2",
            // -- tinybird local configuration (optional)
            "local": {
                "enabled": true,
                "token": "local-stats-or-admin-token",
            }
        }
    }
}
```

#### Testing

Tests are executed using `test run` when running `tb dev`.


#### Testing data

In fixtures folder, you can find local test data. When tinybird local is running, you can append data, or remove data
from fixture files here. As you modify the files, the datasources will be auto updated.

Keep in mind that as you update fixtures, it will rebuild data, but materialized views will have appended data. Old
data will not be cleared from them. One way to approach this to make sure data is consistent is to truncate all data
sources before adding test data to it.

### Architecture

[See full documentation regarding analytics architecture in following document](ARCHITECTURE.md)
