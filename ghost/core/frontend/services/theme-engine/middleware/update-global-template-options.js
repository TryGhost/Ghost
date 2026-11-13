const urlUtils = require('../../../../shared/url-utils').default;
const settingsCache = require('../../../../shared/settings-cache');
const customThemeSettingsCache = require('../../../../shared/custom-theme-settings-cache');
const labs = require('../../../../shared/labs');
const engine = require('../engine');
const activeTheme = require('../active');

function getSiteData() {
  const siteData = settingsCache.getPublic();

  // theme-only computed property added to @site
  if (settingsCache.get('members_signup_access') === 'none') {
    const escapedUrl = encodeURIComponent(urlUtils.urlFor({ relativeUrl: '/rss/' }, true));
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

  const theme = activeTheme.get();
  const themeData = {
    posts_per_page: theme.config('posts_per_page'),
    image_sizes: theme.config('image_sizes'),
  };
  // A previewed theme starts from its own defaults; Admin's values come with the request
  const themeSettingsData = theme.isPreview
    ? theme.customSettingDefaults
    : customThemeSettingsCache.getAll();

  // @TODO: only do this if something changed?
  {
    // A previewed theme has its own engine; the live site's never sees its options
    (theme.isPreview ? theme.engine : engine).updateTemplateOptions({
      data: {
        site: {
          ...siteData,
          comments_enabled: siteData.comments_enabled !== 'off',
          comments_access: siteData.comments_enabled,
        },
        labs: labsData,
        config: themeData,
        custom: themeSettingsData,
      },
    });
  }

  next();
}

module.exports = updateGlobalTemplateOptions;
