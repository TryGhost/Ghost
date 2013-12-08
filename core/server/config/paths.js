// Contains all path information to be used throughout
// the codebase.

var path              = require('path'),
    when              = require('when'),
    url               = require('url'),
    requireTree       = require('../require-tree'),
    appRoot           = path.resolve(__dirname, '../../../'),
    themePath         = path.resolve(appRoot + '/content/themes'),
    pluginPath        = path.resolve(appRoot + '/content/plugins'),
    themeDirectories  = requireTree(themePath),
    pluginDirectories = requireTree(pluginPath),
    localPath = '',
    availableThemes,

    availablePlugins;


function getPaths() {
    return {
        'appRoot':          appRoot,
        'path':             localPath,
        'webroot':          localPath === '/' ? '' : localPath,
        'config':           path.join(appRoot, 'config.js'),
        'configExample':    path.join(appRoot, 'config.example.js'),
        'themePath':        themePath,
        'pluginPath':       pluginPath,
        'adminViews':       path.join(appRoot, '/core/server/views/'),
        'helperTemplates':  path.join(appRoot, '/core/server/helpers/tpl/'),
        'lang':             path.join(appRoot, '/core/shared/lang/'),
        'availableThemes':  availableThemes,
        'availablePlugins': availablePlugins
    };
}

// TODO: remove configURL and give direct access to config object?
// TODO: not called when executing tests
function updatePaths(configURL) {
    localPath = url.parse(configURL).path;

    // Remove trailing slash
    if (localPath !== '/') {
        localPath = localPath.replace(/\/$/, '');
    }

    return when.all([themeDirectories, pluginDirectories]).then(function (paths) {
        availableThemes = paths[0];
        availablePlugins = paths[1];
        return;
    });
}

module.exports = getPaths;

module.exports.updatePaths = updatePaths;
