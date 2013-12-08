// Holds all theme configuration information
// that as mostly used by templates and handlebar helpers.

var when          = require('when'),

// Variables
    theme,
    themeConfig = {},
    update;


function theme() {
    return themeConfig;
}

// We must pass the api and config object
// into this method due to circular dependencies.
// If we were to require the api module here
// there would be a race condition where the ./models/base
// tries to access the config() object before it is created.
// And we can't require('./index') from here because it is circular.
function update(api, config) {
    return when.all([
        api.settings.read('title'),
        api.settings.read('description'),
        api.settings.read('logo'),
        api.settings.read('cover')
    ]).then(function (globals) {

        themeConfig.path = config.paths().path;

        themeConfig.url = config().url;
        themeConfig.title = globals[0].value;
        themeConfig.description = globals[1].value;
        themeConfig.logo = globals[2] ? globals[2].value : '';
        themeConfig.cover = globals[3] ? globals[3].value : '';
        return;
    });
}

module.exports = theme;
module.exports.update = update;
