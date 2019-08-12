# nql-map-key-values

This utility returns a transformer which can be passed to the `@nexes/nql` library to transform queries

### Usage

```js
const nql = require('@nexes/nql');
const mapKeyValues = require('nql-map-key-values');

nql('good:true', {
    transformer: mapKeyValues({
        key: {
            from: 'good',
            to: 'bad'
        },
        values: [{
            from: true,
            to: false
        }, {
            from: false,
            to: true
        }]
    });
}).toJSON(); // => {bad: false}
```
