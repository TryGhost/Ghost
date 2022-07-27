# Minifier

## Usage
```
const Minifier = require('@tryghost/minifier');
const minifier = new Minifier({
    src: 'my/src/path',
    dest: 'my/dest/path'
});

minifier.minify({
    'some.css': '*.css',
    'then.js': '!(other).js'
});
```

- Minfier constructor requires a src and a dest
- minify() function takes an object with destination file as the key and source glob as the value
    - globs can be anything tiny-glob supports
    - destination files must end with .css or .js
    - src files will be minified according to their destination file extension
