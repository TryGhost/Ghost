// Contains all path information to be used throughout
// the codebase.

var path              = require('path'),
    when              = require('when'),
    url               = require('url'),
    requireTree       = require('../require-tree'),
    appRoot           = path.resolve(__dirname, '../../../'),
    corePath          = path.resolve(appRoot, 'core/'),
    contentPath       = path.resolve(appRoot, 'content/'),
    themePath         = path.resolve(contentPath + '/themes'),
    pluginPath        = path.resolve(contentPath + '/plugins'),
    themeDirectories  = requireTree(themePath),
    pluginDirectories = requireTree(pluginPath),
    localPath = '',
    availableThemes,

    availablePlugins;


function paths() {
    var subdir = localPath === '/' ? '' : localPath;

    return {
        'appRoot':          appRoot,
        'subdir':           subdir,
        'config':           path.join(appRoot, 'config.js'),
        'configExample':    path.join(appRoot, 'config.example.js'),
        'contentPath':      contentPath,
        'corePath':         corePath,
        'themePath':        themePath,
        'pluginPath':       pluginPath,
        'imagesPath':       path.resolve(contentPath, 'images/'),
        'imagesRelPath':    'content/images',
        'adminViews':       path.join(corePath, '/server/views/'),
        'helperTemplates':  path.join(corePath, '/server/helpers/tpl/'),
        'exportPath':       path.join(corePath, '/server/data/export/'),
        'lang':             path.join(corePath, '/shared/lang/'),
        'debugPath':        subdir + '/ghost/debug/',
        'availableThemes':  availableThemes,
        'availablePlugins': availablePlugins
    };
}

// TODO: remove configURL and give direct access to config object?
// TODO: not called when executing tests
function update(configURL) {
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

module.exports = paths;
module.exports.update = update;
