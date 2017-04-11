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
                // getIconDimensions needs the physical path of the ico file
                if (settingsCache.get('icon')) {
                    // CASE: custom uploaded icon
                    filePath = settingsCache.get('icon').replace(new RegExp('^' + utils.url.getSubdir() + '/' + utils.url.STATIC_IMAGE_URL_PREFIX), '');
                    filePath = path.join(config.getContentPath('images'), filePath);
                } else {
                    // CASE: default favicon.ico
                    filePath = path.join(config.get('paths:publicFilePath'), 'favicon.ico');
                }

                return blogIconUtils.getIconDimensions(filePath).then(function (dimensions, err) {
                    if (err) {
                        return reject(err);
                    }

                    logo.dimensions = {
                        width: dimensions.width,
                        height: dimensions.height
                    };

                    return resolve(logo);
                });
            }
        }

        return resolve(logo);
    });
}

module.exports = getBlogLogo;
