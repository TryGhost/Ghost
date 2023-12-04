const {SafeString} = require('../services/handlebars');
const {labs, urlUtils, getFrontendKey, settingsCache} = require('../services/proxy');
const {getFrontendAppConfig, getDataAttributes} = require('../utils/frontend-apps');

module.exports = async function comments(options) {
    // todo: For now check on the comment id to exclude normal pages (we probably have a better way to do this)

    const commentId = this.comment_id;

    if (!commentId) {
        return;
    }

    /**
     * We need to check if comments enabled, because the theme might not be using the other available helpers to check
     * if comments is enabled + the member has access
     * @type {'all'|'paid'|'off'}
     */
    const commentsEnabled = settingsCache.get('comments_enabled');
    const hasAccess = !!this.access;

    if (commentsEnabled === 'off' || !hasAccess) {
        return;
    }

    let colorScheme = 'auto';
    if (options.hash.mode === 'dark' || options.hash.mode === 'light') {
        colorScheme = options.hash.mode;
    }

    let avatarSaturation = parseInt(options.hash.saturation);
    if (isNaN(avatarSaturation)) {
        avatarSaturation = 60;
    }

    let count = true;
    if (options.hash.count === false) {
        count = false;
    }

    // This is null so that the comments-ui can handle the default title
    let title = null;
    if (typeof options.hash.title === 'string') {
        title = options.hash.title;
    }

    let accentColor = '';
    if (options.data.site.accent_color) {
        accentColor = options.data.site.accent_color;
    }

    const frontendKey = await getFrontendKey();
    const {scriptUrl} = getFrontendAppConfig('comments');

    const data = {
        locale: labs.isSet('i18n') ? (settingsCache.get('locale') || 'en') : undefined,
        'ghost-comments': urlUtils.getSiteUrl(),
        api: urlUtils.urlFor('api', {type: 'content'}, true),
        admin: urlUtils.urlFor('admin', true),
        key: frontendKey,
        title: title,
        count: count,
        'post-id': this.id,
        'color-scheme': colorScheme,
        'avatar-saturation': avatarSaturation,
        'accent-color': accentColor,
        'comments-enabled': commentsEnabled,
        publication: settingsCache.get('title')
    };

    const dataAttributes = getDataAttributes(data);

    return new SafeString(`
        <script defer src="${scriptUrl}" ${dataAttributes} crossorigin="anonymous"></script>
    `);
};

module.exports.async = true;
