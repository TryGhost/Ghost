# temp-write [![Build Status](https://travis-ci.org/sindresorhus/temp-write.png?branch=master)](http://travis-ci.org/sindresorhus/temp-write)

> Write String/Buffer to a random temp file


## Install

Install with [npm](https://npmjs.org/package/temp-write)

```
npm install --save temp-write
```


## Example

```js
var fs = require('fs');
var tempWrite = require('temp-write');

var filePath = tempWrite.sync('unicorn');
//=> /var/folders/_1/tk89k8215ts0rg0kmb096nj80000gn/T/4049f192-43e7-43b2-98d9-094e6760861b

fs.readFileSync(filePath, 'utf8');
//=> unicorn
```


## API

### tempWrite(input, callback)

#### input

Type: `String`|`Buffer`

#### callback(err, filePath)

Type: `Function`


### tempWrite.sync(input)

Type: `String`|`Buffer`  
Returns: the file path


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
