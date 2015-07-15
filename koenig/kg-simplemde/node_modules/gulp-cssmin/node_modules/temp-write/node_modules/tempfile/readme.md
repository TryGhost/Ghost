# tempfile [![Build Status](https://travis-ci.org/sindresorhus/tempfile.png?branch=master)](http://travis-ci.org/sindresorhus/tempfile)

> Get a random temp file path


## Install

Install with [npm](https://npmjs.org/package/tempfile)

```
npm install --save tempfile
```


## Example

```js
var tempfile = require('tempfile');
tempfile('.png');
//=> /var/folders/_1/tk89k8215ts0rg0kmb096nj80000gn/T/4049f192-43e7-43b2-98d9-094e6760861b.png
```

## API

### tempfile(extension)

#### extension

Type: `String`

Optionally supply an extension to append to the path.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
