var utils            = require('../../utils'),
    settingsCache    = require('../../settings/cache'),
    blogIconUtils    = require('../../utils/blog-icon'),
    Promise          = require('bluebird'),
    config           = require('../../config'),
    path             = require('path');

function getBlogLogo() {
    return new Promise(function getIconSize(resolve, reject) {
        var logo = {},
            filePath;

        if (settingsCache.get('logo')) {
            logo.url = utils.url.urlFor('image', {image: settingsCache.get('logo')}, true);
        } else {
            // CASE: no publication logo is updated. We can try to use either an uploaded publication icon
            // or use the default one to make
            // Google happy with it. See https://github.com/TryGhost/Ghost/issues/7558
            logo.url = blogIconUtils.getIconUrl(true);

            if (blogIconUtils.isIcoImageType(logo.url)) {
                filePath = blogIconUtils.getIconPath();
                // getIconDimensions needs the physical path of the ico file
                if (settingsCache.get('icon')) {
                    // CASE: custom uploaded icon
                    filePath = path.join(config.getContentPath('images'), filePath);
                }

                return blogIconUtils.getIconDimensions(filePath).then(function (response) {
                    logo.dimensions = {
                        width: response.width,
                        height: response.height
                    };

                    return resolve(logo);
                }).catch(function (err) {
                    return reject(err);
                });
            }
        }

        return resolve(logo);
    });
}

module.exports = getBlogLogo;
