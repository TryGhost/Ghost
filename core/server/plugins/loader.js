
var path = require('path'),
    _    = require('underscore'),
    when = require('when'),
    ghostInstance,
    loader;

function getGhostInstance() {
    if (ghostInstance) {
        return ghostInstance;
    }

    var Ghost = require('../../ghost');

    ghostInstance = new Ghost();

    return ghostInstance;
}

// Get a relative path to the given plugins root, defaults
// to be relative to __dirname
function getPluginRelativePath(name, relativeTo, ghost) {
    ghost = ghost || getGhostInstance();
    relativeTo = relativeTo || __dirname;

    return path.relative(relativeTo, path.join(ghost.paths().pluginPath, name));
}


function getPluginByName(name, ghost) {
    ghost = ghost || getGhostInstance();

    // Grab the plugin class to instantiate
    var PluginClass = require(getPluginRelativePath(name)),
        plugin;

    // Check for an actual class, otherwise just use whatever was returned
    if (_.isFunction(PluginClass)) {
        plugin = new PluginClass(ghost);
    } else {
        plugin = PluginClass;
    }

    return plugin;
}

// The loader is responsible for loading plugins
loader = {
    // Load a plugin and return the instantiated plugin
    installPluginByName: function (name, ghost) {
        var plugin = getPluginByName(name, ghost);

        // Check for an install() method on the plugin.
        if (!_.isFunction(plugin.install)) {
            return when.reject(new Error("Error loading plugin named " + name + "; no install() method defined."));
        }

        // Wrapping the install() with a when because it's possible
        // to not return a promise from it.
        return when(plugin.install(ghost)).then(function () {
            return when.resolve(plugin);
        });
    },

    // Activate a plugin and return it
    activatePluginByName: function (name, ghost) {
        var plugin = getPluginByName(name, ghost);

        // Check for an activate() method on the plugin.
        if (!_.isFunction(plugin.activate)) {
            return when.reject(new Error("Error loading plugin named " + name + "; no activate() method defined."));
        }

        // Wrapping the activate() with a when because it's possible
        // to not return a promise from it.
        return when(plugin.activate(ghost)).then(function () {
            return when.resolve(plugin);
        });
    }
};

module.exports = loader;