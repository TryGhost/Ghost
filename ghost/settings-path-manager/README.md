# Settings Path Manager
A library which helps locating configuration paths in Ghost. For example configs for dynamic routes or redirects.

## Usage
Example use in to create routes.yaml configuration files:
```js
const config = require('../shared/config'); // or whatever place the storage folders are configured at

const settingsPathManager = new SettingsPathManager({
    type: 'routes',
    paths: [config.getContentPath('settings')]
});

const filePath = settingsPathManager.getDefaultFilePath();

console.log(config.getContentPath('settings')); // -> '/content/data/'
console.log(filePath); // -> '/content/data/routes.yaml'
```
