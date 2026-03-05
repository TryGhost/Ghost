const urlUtils = require('../../shared/url-utils');
const logging = require('@tryghost/logging');
const settingsCache = require('../../shared/settings-cache');
const {blogIcon} = require('../../server/lib/image');

function getBlogLogo() {
    const logo = {};

    if (settingsCache.get('logo')) {
        logo.url = urlUtils.urlFor('image', {image: settingsCache.get('logo')}, true);
        console.log('[IMAGE-CDN-TEST] getBlogLogo -> using site logo', {logoSetting: settingsCache.get('logo'), resolvedUrl: logo.url});
        logging.info('[IMAGE-CDN-TEST] getBlogLogo -> using site logo', {logoSetting: settingsCache.get('logo'), resolvedUrl: logo.url});
    } else {
        // CASE: no publication logo is updated. We can try to use either an uploaded publication icon
        // or use the default one to make
        // Google happy with it. See https://github.com/TryGhost/Ghost/issues/7558
        logo.url = blogIcon.getIconUrl({absolute: true});
        console.log('[IMAGE-CDN-TEST] getBlogLogo -> fallback to icon', {resolvedUrl: logo.url});
        logging.info('[IMAGE-CDN-TEST] getBlogLogo -> fallback to icon', {resolvedUrl: logo.url});
    }

    return logo;
}

module.exports = getBlogLogo;
