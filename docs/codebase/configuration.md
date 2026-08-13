# Configuration

Ghost's configuration system is based on
[nconf](https://www.npmjs.com/package/nconf). Use of config for certain settings
allows Ghost to be more flexible across different environments and more tunable
for specific use cases. It's also a common way to test changes or roll out new
code paths in a controlled manner (ones that wouldn't be appropriate for a user
Labs flag).

In our framework repository we have a `@tryghost/config` wrapper library, which
we use in lots of other smaller projects, but not Ghost itself.

Ghost's own configuration "lib" lives in `/core/core/shared/config` alongside a
lot of the configuration. The files are all loaded in a specific order, in
order to create a cascade that looks like this:

- `core/shared/config/defaults.json` - global defaults
- `core/shared/config/env/config.${env}.json` - env-specific defaults
- `config.${env}.json` - overrides you might have locally (note,
  `config.development.json` should not be modified)
- `config.local.json` - for local dev
- environment variables (all lowercase 🙈)
- argv - command line flags
- `core/shared/config/overrides.json` - these can't be changed

## Developing locally

To change config when you're developing locally, you should create a
`config.local.json` in the core folder, and change config there.

Config changes require a restart - hot reload will not recognize the file
change so you'll need to do this manually.

## Accessing Config Settings

Access the setting using the nconf loader in `ghost/core/core/shared/config`.

For the given config below:

```json
{
    "server": {
        "port": 2368
    }
}
```

You can access the settings by either grabbing the group or an individual item.

```javascript
const serverPort = config.get('server:port') // 2368

// note you do not access properties using .get if grabbing a nested setting
const serverConfig = config.get('server'); // {port: 2368};
console.log(serverConfig.port) // 2368
console.log(serverConfig.get('port')) // undefined
```

## Creating a New Config Setting

Adding a new config setting is a simple endeavor.

> `camelCase` is preferred for settings, though you will also see `snake_case`.

Add the setting to `core/shared/config/defaults.json`; this is the easiest way
for all developers to understand what flags are out there and aids with keeping
the settings organized and avoids duplicates. Note that has not been
consistently done in the past, so you should always check for existing flags.
See above for accessing the setting.
