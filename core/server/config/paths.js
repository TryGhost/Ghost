

var path              = require('path'),
    when              = require('when'),
    requireTree       = require('../require-tree'),
    appRoot           = path.resolve(__dirname, '../../../'),
    themePath         = path.resolve(appRoot + '/content/themes'),
    pluginPath        = path.resolve(appRoot + '/content/plugins'),
    themeDirectories  = requireTree(themePath),
    pluginDirectories = requireTree(pluginPath),
    activeTheme       = '',
    availableThemes,
    availablePlugins;


function getPaths() {
    return {
        'appRoot':          appRoot,
        'themePath':        themePath,
        'pluginPath':       pluginPath,
        'activeTheme':      path.join(themePath, activeTheme),
        'adminViews':       path.join(appRoot, '/core/server/views/'),
        'helperTemplates':  path.join(appRoot, '/core/server/helpers/tpl/'),
        'lang':             path.join(appRoot, '/core/shared/lang/'),
        'availableThemes':  availableThemes,
        'availablePlugins': availablePlugins
    };
}


function updatePaths() {
    return when.all([themeDirectories, pluginDirectories]).then(function (paths) {
        availableThemes = paths[0];
        availablePlugins = paths[1];
        return;
    });
}

function setActiveTheme(ghost) {
    if (ghost && ghost.settingsCache) {
        activeTheme = ghost.settingsCache.activeTheme.value;
    }
}

module.exports = getPaths;

module.exports.updatePaths = updatePaths;

module.exports.setActiveTheme = setActiveTheme;