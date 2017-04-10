var utils            = require('../../utils'),
    settingsCache    = require('../../settings/cache'),
    blogIconUtils    = require('../../utils/blog-icon'),
    config           = require('../../config'),
    path             = require('path');

function getBlogLogo() {
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
            if (settingsCache.get('icon')) {
                filePath = settingsCache.get('icon').replace(new RegExp('^' + utils.url.getSubdir() + '/' + utils.url.STATIC_IMAGE_URL_PREFIX), '');
                filePath = path.join(config.getContentPath('images'), filePath);
            } else {
                filePath = path.join(config.get('paths:publicFilePath'), 'favicon.ico');
            }
            // For now, return hard coded values
            logo.dimensions = {
                width: 60,
                height: 60
            };
            // TODO: make this work with getIconDimensions to fetch the real ico sizes
            // // getIconDimensions needs the physical path of the ico file
            // return blogIconUtils.getIconDimensions(filePath).then(function (dimensions, err) {
            //     if (err) {
            //         console.log(err);
            //     }
            //     return {
            //         width: dimensions.width,
            //         height: dimensions.height
            //     }
            // });
        }
    }

    return logo;
}

module.exports = getBlogLogo;
