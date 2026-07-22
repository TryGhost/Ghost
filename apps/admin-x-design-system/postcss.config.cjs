// Plugins are `require`d here rather than named as strings so that they resolve
// from this package, which declares them as devDependencies.
//
// Passing plugin instances keeps resolution anchored to this package instead
// of relying on postcss-load-config to resolve string names from a consumer's
// search path.
const postcssImport = require('postcss-import');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

module.exports = {
    plugins: [
        postcssImport(),
        tailwindcss(),
        autoprefixer()
    ]
};
