# vinyl [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Dependency Status](https://david-dm.org/wearefractal/vinyl.png?theme=shields.io)](https://david-dm.org/wearefractal/vinyl)


## Information

<table>
<tr>
<td>Package</td><td>vinyl</td>
</tr>
<tr>
<td>Description</td>
<td>A virtual file format</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.9</td>
</tr>
</table>

## What is this?

Read this for more info about how this plays into the grand scheme of things https://medium.com/@eschoff/3828e8126466

## File

```javascript
var File = require('vinyl');

var coffeeFile = new File({
  cwd: "/",
  base: "/test/",
  path: "/test/file.coffee",
  contents: new Buffer("test = 123")
});
```

### constructor(options)

#### options.cwd

Type: `String`<br>
Default: `process.cwd()`

#### options.base

Used for relative pathing. Typically where a glob starts.

Type: `String`<br>
Default: `options.cwd`

#### options.path

Full path to the file.

Type: `String`<br>
Default: `undefined`

#### options.history

Path history. Has no effect if `options.path` is passed.

Type: `Array`<br>
Default: `options.path ? [options.path] : []`

#### options.stat

The result of an fs.stat call. See [fs.Stats](http://nodejs.org/api/fs.html#fs_class_fs_stats) for more information.

Type: `fs.Stats`<br>
Default: `null`

#### options.contents

File contents.

Type: `Buffer, Stream, or null`<br>
Default: `null`

### isBuffer()

Returns true if file.contents is a Buffer.

### isStream()

Returns true if file.contents is a Stream.

### isNull()

Returns true if file.contents is null.

### clone([opt])

Returns a new File object with all attributes cloned.
By default custom attributes are deep-cloned.

If opt or opt.deep is false, custom attributes will not be deep-cloned.

If opt.contents is false, it will copy file.contents Buffer's reference.

### pipe(stream[, opt])

If file.contents is a Buffer, it will write it to the stream.

If file.contents is a Stream, it will pipe it to the stream.

If file.contents is null, it will do nothing.

If opt.end is false, the destination stream will not be ended (same as node core).

Returns the stream.

### inspect()

Returns a pretty String interpretation of the File. Useful for console.log.

### path

Absolute pathname string or `undefined`. Setting to a different value pushes the old value to `history`.

### history

Array of `path` values the file object has had, from `history[0]` (original) through `history[history.length - 1]` (current). `history` and its elements should normally be treated as read-only and only altered indirectly by setting `path`.

### relative

Returns path.relative for the file base and file path.

Example:

```javascript
var file = new File({
  cwd: "/",
  base: "/test/",
  path: "/test/file.coffee"
});

console.log(file.relative); // file.coffee
```

### dirname

Gets and sets path.dirname for the file path.

Example:

```javascript
var file = new File({
  cwd: "/",
  base: "/test/",
  path: "/test/file.coffee"
});

console.log(file.dirname); // /test

file.dirname = '/specs';

console.log(file.dirname); // /specs
console.log(file.path); // /specs/file.coffee
````

### basename

Gets and sets path.basename for the file path.

Example:

```javascript
var file = new File({
  cwd: "/",
  base: "/test/",
  path: "/test/file.coffee"
});

console.log(file.basename); // file.coffee

file.basename = 'file.js';

console.log(file.basename); // file.js
console.log(file.path); // /test/file.js
````

### extname

Gets and sets path.extname for the file path.

Example:

```javascript
var file = new File({
  cwd: "/",
  base: "/test/",
  path: "/test/file.coffee"
});

console.log(file.extname); // .coffee

file.extname = '.js';

console.log(file.extname); // .js
console.log(file.path); // /test/file.js
````

[npm-url]: https://npmjs.org/package/vinyl
[npm-image]: https://badge.fury.io/js/vinyl.png
[travis-url]: https://travis-ci.org/wearefractal/vinyl
[travis-image]: https://travis-ci.org/wearefractal/vinyl.png?branch=master
[coveralls-url]: https://coveralls.io/r/wearefractal/vinyl
[coveralls-image]: https://coveralls.io/repos/wearefractal/vinyl/badge.png
[depstat-url]: https://david-dm.org/wearefractal/vinyl
[depstat-image]: https://david-dm.org/wearefractal/vinyl.png
