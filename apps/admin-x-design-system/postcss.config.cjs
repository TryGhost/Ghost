// Plugins are `require`d here rather than named as strings so that they resolve
// from this package, which declares them as devDependencies.
//
// postcss-load-config resolves string plugin names relative to the searchPath --
// the directory the consuming build discovered a config in -- not the file that
// defined the plugin list. admin-x-settings re-exports this config, so string
// names get resolved from apps/admin-x-settings, which does not declare
// postcss-import, @tailwindcss/postcss or autoprefixer (and should not have to).
// Passing plugin instances keeps resolution anchored to this package.
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
