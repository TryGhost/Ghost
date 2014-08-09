// Holds all theme configuration information
// that as mostly used by templates and handlebar helpers.

var when        = require('when'),

// Variables
    themeConfig = {};


function theme() {
    return themeConfig;
}

// We must pass the api.settings object
// into this method due to circular dependencies.
// If we were to require the api module here
// there would be a race condition where the ./models/base
// tries to access the config() object before it is created.
function update(settings, configUrl) {
    // TODO: Pass the context into this method instead of hard coding internal: true?
    return when.all([
        settings.read('title'),
        settings.read('description'),
        settings.read('logo'),
        settings.read('cover')
    ]).then(function (globals) {
        // normalise the URL by removing any trailing slash
        themeConfig.url = configUrl.replace(/\/$/, '');
        themeConfig.title = globals[0].settings[0].value;
        themeConfig.description = globals[1].settings[0].value;
        themeConfig.logo = globals[2].settings[0] ? globals[2].settings[0].value : '';
        themeConfig.cover = globals[3].settings[0] ? globals[3].settings[0].value : '';
        return;
    });
}

module.exports = theme;
module.exports.update = update;
