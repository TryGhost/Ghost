# Adapter Manager

A manager for retrieving custom "adapters" - can be used to abstract away from custom implementations

## Usage

```js
const AdapterManager = require('@tryghost/adapter-manager');

const adapterManager = new AdapterManager({
    pathsToAdapters: [
        '/path/to/custom/adapters',
        '/path/to/default/adapters'
    ]
});

class MailAdapterBase {
    someMethod() {}
}

adapterManager.register('mail', MailAdapterBase);

const mailAdapterInstance = adapterManager.getAdapter('mail', 'direct', mailConfig);

mailAdapterInstance.someMethod();
```
