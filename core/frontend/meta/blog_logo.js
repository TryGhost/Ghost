const urlUtils = require('../../shared/url-utils');
const settingsCache = require('../../server/services/settings/cache');
const {blogIcon} = require('../../server/lib/image');

function getBlogLogo() {
    const logo = {};

    if (settingsCache.get('logo')) {
        logo.url = urlUtils.urlFor('image', {image: settingsCache.get('logo')}, true);
    } else {
        // CASE: no publication logo is updated. We can try to use either an uploaded publication icon
        // or use the default one to make
        // Google happy with it. See https://github.com/TryGhost/Ghost/issues/7558
        logo.url = blogIcon.getIconUrl(true);
    }

    return logo;
}

module.exports = getBlogLogo;
