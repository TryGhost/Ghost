// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
const {blogIcon, settingsCache, urlUtils} = require('../services/proxy');
const {SafeString} = require('../services/handlebars');
const buildGiftToast = require('./utils/gift-toast');
const _ = require('lodash');

// We use the name ghost_foot to match the helper for consistency:
module.exports = function ghost_foot(options) { // eslint-disable-line camelcase
    const foot = [];

    const globalCodeinjection = settingsCache.get('codeinjection_foot');
    const postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;
    const tagCodeinjection = options.data.root && options.data.root.tag ? options.data.root.tag.codeinjection_foot : null;

    if (!_.isEmpty(globalCodeinjection)) {
        foot.push(globalCodeinjection);
    }

    if (!_.isEmpty(postCodeinjection)) {
        foot.push(postCodeinjection);
    }

    if (!_.isEmpty(tagCodeinjection)) {
        foot.push(tagCodeinjection);
    }

    // Reader-side gift announcement. `@gift` is set by the gift-links controller
    // only on the verified render path (valid token, matching slug), so the
    // toast appears exactly on gift renders and never on canonical post URLs.
    if (options.data && options.data.gift) {
        const logo = settingsCache.get('logo');
        const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');

        foot.push(buildGiftToast({
            accentColor: settingsCache.get('accent_color') || '#15171a',
            logoUrl: logo ? urlUtils.urlFor('image', {image: logo}, true) : null,
            iconUrl: blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            orbUrl: `${siteUrl}/gift/assets/gift-card-orb.png`,
            noiseUrl: `${siteUrl}/gift/assets/gift-card-noise.png`
        }));
    }

    return new SafeString(foot.join(' ').trim());
};
