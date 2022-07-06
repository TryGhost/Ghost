const hbs = require('../engine');
const urlUtils = require('../../../../shared/url-utils');
const settingsCache = require('../../../../shared/settings-cache');
const customThemeSettingsCache = require('../../../../shared/custom-theme-settings-cache');
const labs = require('../../../../shared/labs');
const activeTheme = require('../active');

function getSiteData() {
    let siteData = settingsCache.getPublic();

    // theme-only computed property added to @site
    if (settingsCache.get('members_signup_access') === 'none') {
        const escapedUrl = encodeURIComponent(urlUtils.urlFor({relativeUrl: '/rss/'}, true));
        siteData.signup_url = `https://feedly.com/i/subscription/feed/${escapedUrl}`;
    } else {
        siteData.signup_url = '#/portal';
    }

    return siteData;
}

async function updateGlobalTemplateOptions(req, res, next) {
    // Static information, same for every request unless the settings change
    // @TODO: bind this once and then update based on events?
    // @TODO: decouple theme layer from settings cache using the Content API
    const siteData = getSiteData();
    const labsData = labs.getAll();

    const themeData = {
        posts_per_page: activeTheme.get().config('posts_per_page'),
        image_sizes: activeTheme.get().config('image_sizes')
    };
    const themeSettingsData = customThemeSettingsCache.getAll();

    // @TODO: only do this if something changed?
    {
        hbs.updateTemplateOptions({
            data: {
                site: siteData,
                labs: labsData,
                config: themeData,
                custom: themeSettingsData
            }
        });
    }

    next();
}

module.exports = updateGlobalTemplateOptions;
