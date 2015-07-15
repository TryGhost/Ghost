[![build status](https://secure.travis-ci.org/avoidwork/filesize.js.png)](http://travis-ci.org/avoidwork/filesize.js)
# filesize.js

filesize.js provides a simple way to get a human readable file size string from a number (float or integer) or string.

## Optional settings

`filesize()` accepts an optional descriptor Object as a second argument, so you can customize the output.

### bits
_***(boolean)***_ Enables `bit` sizes, default is `false`

### unix
_***(boolean)***_ Enables unix style human readable output, e.g `ls -lh`, default is `false`

### base
_***(number)***_ Number base, default is `10`

### round
_***(number)***_ Decimal place, default is `2`

### spacer
_***(string)***_ Character between the `result` and `suffix`, default is `" "`

### suffixes
_***(object)***_ Dictionary of SI suffixes to replace for localization, defaults to english if no match is found

## Examples

```javascript
filesize(500);                         // "500 B"
filesize(500, {bits: true});           // "4.00 kb"
filesize(265318);                      // "265.32 kB"
filesize(265318, {base: 2});           // "259.10 kB"
filesize(265318, {base: 2, round: 1}); // "259.1 kB"
filesize(1, {suffixes: {B: "Б"}});     // "1 Б"
```

## How can I load filesize.js?

filesize.js supports AMD loaders (require.js, curl.js, etc.), node.js & npm (npm install filesize), or using a script tag.

## Support

If you're having problems, use the support forum at CodersClan.

<a href="http://codersclan.net/forum/index.php?repo_id=11"><img src="http://www.codersclan.net/graphics/getSupport_blue_big.png" width="160"></a>

## License
Copyright (c) 2013 Jason Mulligan  
Licensed under the BSD-3 license.
