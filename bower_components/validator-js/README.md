# validator.js

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Downloads][downloads-image]][npm-url]

A library of string validators and sanitizers.

### Server-side usage

Install the library with `npm install validator`

```javascript
var validator = require('validator');

validator.isEmail('foo@bar.com'); //=> true
```

### Client-side usage

The library can be loaded either as a standalone script, or through an [AMD][amd]-compatible loader

```html
<script type="text/javascript" src="validator.min.js"></script>
<script type="text/javascript">
  validator.isEmail('foo@bar.com'); //=> true
</script>
```

The library can also be installed through [bower][bower]

```bash
$ bower install validator-js
```

### Validators

- **equals(str, comparison)** - check if the string matches the comparison.
- **contains(str, seed)** - check if the string contains the seed.
- **matches(str, pattern [, modifiers])** - check if string matches the pattern. Either `matches('foo', /foo/i)` or `matches('foo', 'foo', 'i')`.
- **isEmail(str)** - check if the string is an email.
- **isURL(str [, options])** - check if the string is an URL. `options` is an object which defaults to `{ protocols: ['http','https','ftp'], require_tld: true, require_protocol: false, allow_underscores: false, host_whitelist: false, host_blacklist: false, allow_trailing_dot: false }`.
- **isFQDN(str [, options])** - check if the string is a fully qualified domain name (e.g. domain.com). `options` is an object which defaults to `{ require_tld: true, allow_underscores: false, allow_trailing_dot: false }`.
- **isIP(str [, version])** - check if the string is an IP (version 4 or 6).
- **isAlpha(str)** - check if the string contains only letters (a-zA-Z).
- **isNumeric(str)** - check if the string contains only numbers.
- **isAlphanumeric(str)** - check if the string contains only letters and numbers.
- **isBase64(str)** - check if a string is base64 encoded.
- **isHexadecimal(str)** - check if the string is a hexadecimal number.
- **isHexColor(str)** - check if the string is a hexadecimal color.
- **isLowercase(str)** - check if the string is lowercase.
- **isUppercase(str)** - check if the string is uppercase.
- **isInt(str)** - check if the string is an integer.
- **isFloat(str)** - check if the string is a float.
- **isDivisibleBy(str, number)** - check if the string is a number that's divisible by another.
- **isNull(str)** - check if the string is null.
- **isLength(str, min [, max])** - check if the string's length falls in a range. Note: this function takes into account surrogate pairs.
- **isByteLength(str, min [, max])** - check if the string's length (in bytes) falls in a range.
- **isUUID(str [, version])** - check if the string is a UUID (version 3, 4 or 5).
- **isDate(str)** - check if the string is a date.
- **isAfter(str [, date])** - check if the string is a date that's after the specified date (defaults to now).
- **isBefore(str [, date])** - check if the string is a date that's before the specified date.
- **isIn(str, values)** - check if the string is in a array of allowed values.
- **isCreditCard(str)** - check if the string is a credit card.
- **isISBN(str [, version])** - check if the string is an ISBN (version 10 or 13).
- **isMobilePhone(str, [, locale])** - check if the string is a mobile phone number, (locale should be locales, like 'zh-CN', currently only support 'zh-CN').
- **isJSON(str)** - check if the string is valid JSON (note: uses JSON.parse).
- **isMultibyte(str)** - check if the string contains one or more multibyte chars.
- **isAscii(str)** - check if the string contains ASCII chars only.
- **isFullWidth(str)** - check if the string contains any full-width chars.
- **isHalfWidth(str)** - check if the string contains any half-width chars.
- **isVariableWidth(str)** - check if the string contains a mixture of full and half-width chars.
- **isSurrogatePair(str)** - check if the string contains any surrogate pairs chars.
- **isMongoId(str)** - check if the string is a valid hex-encoded representation of a [MongoDB ObjectId][mongoid].

### Sanitizers

- **toString(input)** - convert the input to a string.
- **toDate(input)** - convert the input to a date, or `null` if the input is not a date.
- **toFloat(input)** - convert the input to a float, or `NaN` if the input is not a float.
- **toInt(input [, radix])** - convert the input to an integer, or `NaN` if the input is not an integer.
- **toBoolean(input [, strict])** - convert the input to a boolean. Everything except for `'0'`, `'false'` and `''` returns `true`. In strict mode only `'1'` and `'true'` return `true`.
- **trim(input [, chars])** - trim characters (whitespace by default) from both sides of the input.
- **ltrim(input [, chars])** - trim characters from the left-side of the input.
- **rtrim(input [, chars])** - trim characters from the right-side of the input.
- **escape(input)** - replace `<`, `>`, `&`, `'`, `"` and `/` with HTML entities. 
- **stripLow(input [, keep_new_lines])** - remove characters with a numerical value < 32 and 127, mostly control characters. If `keep_new_lines` is `true`, newline characters are preserved (`\n` and `\r`, hex `0xA` and `0xD`). Unicode-safe in JavaScript.
- **whitelist(input, chars)** - remove characters that do not appear in the whitelist. The characters are used in a RegExp and so you will need to escape some chars, e.g. whitelist(input, '\\[\\]').
- **blacklist(input, chars)** - remove characters that appear in the blacklist. The characters are used in a RegExp and so you will need to escape some chars, e.g. blacklist(input, '\\[\\]').
- **normalizeEmail(email [, options])** - canonicalize an email address. `options` is an object which defaults to `{ lowercase: true }`. With `lowercase` set to `true`, the local part of the email address is lowercased for all domains; the hostname is always lowercased and the local part of the email address is always lowercased for hosts that are known to be case-insensitive (currently only GMail). Normalization follows special rules for known providers: currently, GMail addresses have dots removed in the local part and are stripped of tags (e.g. `some.one+tag@gmail.com` becomes `someone@gmail.com`) and all `@googlemail.com` addresses are normalized to `@gmail.com`.

### Strings only

This library validates and sanitizes **strings** only. All input will be coerced to a string using the following rules

- Call the `toString` property if available.
- Replace `null`, `undefined` or `NaN` with an empty string.
- Everything else is coerced with `input + ''`.

### Extensions

You can add your own validators using `validator.extend(name, fn)`

```javascript
validator.extend('isFinite', function (str) {
    return isFinite(str);
});
```

Note that the first argument will be automatically coerced to a string.

```javascript
validator.isFinite(12345); // => true
validator.isFinite('foo'); // => false
```

### Deprecations

Version 3 of the library deprecated some functionality

- **XSS sanitizer**: Here's [why][remove-xss]. Use [Google Caja][caja] instead.
- **Entity encoding**: Use [fb55/entities][entities] or [substack/node-ent][node-ent].
- **Validator chaining**: The API was too unintuitive. I'd prefer to let users create their own higher-level patterns from the provided building blocks.

If you're migrating from version `1.x` or `2.x`, check out the [migration guide](https://github.com/chriso/validator.js/wiki/Migrating-from-1.x-and-2.x).

### Tests

- `make test` - run the test suite.
- `make test V=1` - run the test suite with added verbosity.
- `make test TEST=pattern` - run tests that match a pattern.
- `make coverage` - run a coverage analysis tool.
- `make lint` - run a lint tool.

### License (MIT)

```
Copyright (c) 2014 Chris O'Hara <cohara87@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

[downloads-image]: http://img.shields.io/npm/dm/validator.svg

[npm-url]: https://npmjs.org/package/validator
[npm-image]: http://img.shields.io/npm/v/validator.svg

[travis-url]: https://travis-ci.org/chriso/validator.js
[travis-image]: http://img.shields.io/travis/chriso/validator.js.svg

[coveralls-url]: https://coveralls.io/r/chriso/validator.js
[coveralls-image]: http://img.shields.io/coveralls/chriso/validator.js/master.svg

[amd]: http://requirejs.org/docs/whyamd.html
[bower]: http://bower.io/

[mongoid]: http://docs.mongodb.org/manual/reference/object-id/

[remove-xss]: https://github.com/chriso/validator.js/commit/2d5d6999541add350fb396ef02dc42ca3215049e
[caja]: https://code.google.com/p/google-caja/source/browse/trunk/src/com/google/caja/plugin/html-sanitizer.js
[entities]: https://github.com/fb55/node-entities
[node-ent]: https://github.com/substack/node-ent
