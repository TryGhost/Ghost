# meow [![Build Status](https://travis-ci.org/sindresorhus/meow.svg?branch=master)](https://travis-ci.org/sindresorhus/meow)

> CLI app helper

![](meow.gif)


## Features

- Parses arguments using [minimist](https://github.com/substack/minimist)
- Converts flags to [camelCase](https://github.com/sindresorhus/camelcase)
- Outputs version when `--version`
- Outputs description and supplied help text when `--help`


## Install

```
$ npm install --save meow
```


## Usage

```
$ ./foo-app.js unicorns --rainbow-cake
```

```js
#!/usr/bin/env node
'use strict';
var meow = require('meow');
var fooApp = require('./');

var cli = meow({
	help: [
		'Usage',
		'  foo-app <input>'
	]
});
/*
{
	input: ['unicorns'],
	flags: {rainbowCake: true},
	...
}
*/

fooApp(cli.input[0], cli.flags);
```


## API

### meow(options, minimistOptions)

Returns an object with:

- `input` *(array)* - Non-flag arguments
- `flags` *(object)* - Flags converted to camelCase
- `pkg` *(object)* - The `package.json` object
- `help` *(object)* - The help text used with `--help`
- `showHelp()` *(function)* - Show the help text and exit

#### options

##### help

Type: `array`, `string`, `boolean`

The help text you want shown.

If it's an array each item will be a line.

If you don't specify anything, it will still show the package.json `"description"`.

Set it to `false` to disable it all together.

##### version

Type: `string`, `boolean`  
Default: the package.json `"version"` property

Set a custom version output.

Set it to `false` to disable it all together.

##### pkg

Type: `string`, `object`  
Default: `package.json`

Relative path to `package.json` or it as an object.

##### argv

Type: `array`  
Default: `process.argv.slice(2)`

Custom arguments object.

#### minimistOptions

Type: `object`  
Default: `{}`

Minimist [options](https://github.com/substack/minimist#var-argv--parseargsargs-opts).


## Tip

Use [get-stdin](https://github.com/sindresorhus/get-stdin) if you need to accept input from stdin.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
