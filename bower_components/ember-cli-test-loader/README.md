## Ember CLI Test Loader

Defines a `TestLoader` object that reviews all of the modules in
`requirejs.entries` and loads those identified as tests.

`TestLoader.prototype.shouldLoadModule` can be overridden in order to customize
the criteria for identifying test modules.

### Usage

Within your test suite:

```javascript
  var TestLoader = require('ember-cli/test-loader')['default'];

  // optionally override TestLoader.prototype.shouldLoadModule

  TestLoader.load();
```
