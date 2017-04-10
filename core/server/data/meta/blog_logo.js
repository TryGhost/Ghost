var utils            = require('../../utils'),
    settingsCache    = require('../../settings/cache');

function getBlogLogo() {
    var logo = {};

    if (settingsCache.get('logo')) {
        logo.url = utils.url.urlFor('image', {image: settingsCache.get('logo')}, true);
    } else {
        // CASE: no publication logo is updated. We can try to use either an uploaded publication icon
        // or use the default one to make
        // Google happy with it. See https://github.com/TryGhost/Ghost/issues/7558
        if (settingsCache.get('icon')) {
            // CASE: we have a custom publication icon
            logo.url = utils.url.urlFor('image', {image: settingsCache.get('icon')}, true);
            // TODO: make a util that checks for `ico` file extension
            if (logo.url.match(/\.ico$/i)) {
                // CASE: we have an `.ico` file extension. `image-size` util can't fetch dimensions
                // for this file extension
                logo.dimensions = {
                    width: 60,
                    height: 60
                };
            }
        } else {
            logo.url = utils.url.urlFor({relativeUrl: '/favicon.ico'}, true);
            logo.dimensions = {
                width: 60,
                height: 60
            };
        }
    }

    return logo;
}

module.exports = getBlogLogo;
