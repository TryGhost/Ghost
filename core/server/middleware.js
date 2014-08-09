/*
This file is a shim to accomodate simple file system merge upgrade from 0.3.3 to 0.4.
During a file system merge upgrade from 0.3.3 to 0.4, the old version of this file will
persist unless this shim is in place. Problems arise when the stale 0.3.3 version of 
this file exists as well as the new directory of files bearing the same name in 0.4.
Node's require defaults to loading the 0.3.3 version causing errors. This file replaces
the old 0.3.3 version. This allows all dependent modules to continue requiring their
dependencies the way they always have. See issue 1873 for more information.

https://github.com/TryGhost/Ghost/issues/1873
*/
var middleware = require('./middleware/index.js');

module.exports = middleware;
