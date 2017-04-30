var coreHelpers = {},
    register = require('./register'),
    registerThemeHelper = register.registerThemeHelper,
    registerAsyncThemeHelper = register.registerAsyncThemeHelper,
    registerAllCoreHelpers,
    proxy = require('./proxy'),
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString,
    i18n = proxy.i18n,
    locale = i18n.locale();
    i18nCss = new SafeString(getAssetUrl("css/" + locale + ".css"));

coreHelpers.asset = require('./asset');
coreHelpers.author = require('./author');
coreHelpers.body_class = require('./body_class');
coreHelpers.content = require('./content');
coreHelpers.date = require('./date');
coreHelpers.encode = require('./encode');
coreHelpers.excerpt = require('./excerpt');
coreHelpers.facebook_url = require('./facebook_url');
coreHelpers.foreach = require('./foreach');
coreHelpers.get = require('./get');
coreHelpers.ghost_foot = require('./ghost_foot');
coreHelpers.ghost_head = require('./ghost_head');
coreHelpers.img_url = require('./img_url');
coreHelpers.is = require('./is');
coreHelpers.has = require('./has');
coreHelpers.meta_description = require('./meta_description');
coreHelpers.meta_title = require('./meta_title');
coreHelpers.navigation = require('./navigation');
coreHelpers.page_url = require('./page_url');
coreHelpers.pagination = require('./pagination');
coreHelpers.plural = require('./plural');
coreHelpers.post_class = require('./post_class');
coreHelpers.prev_post = require('./prev_next');
coreHelpers.next_post = require('./prev_next');
coreHelpers.tags = require('./tags');
coreHelpers.title = require('./title');
coreHelpers.twitter_url = require('./twitter_url');
coreHelpers.url = require('./url');

registerAllCoreHelpers = function registerAllCoreHelpers() {
    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);
    registerThemeHelper('author', coreHelpers.author);
    registerThemeHelper('body_class', coreHelpers.body_class);
    registerThemeHelper('content', coreHelpers.content);
    registerThemeHelper('date', coreHelpers.date);
    registerThemeHelper('encode', coreHelpers.encode);
    registerThemeHelper('excerpt', coreHelpers.excerpt);
    registerThemeHelper('foreach', coreHelpers.foreach);
    registerThemeHelper('has', coreHelpers.has);
    registerThemeHelper('is', coreHelpers.is);
    registerThemeHelper('img_url', coreHelpers.img_url);
    registerThemeHelper('meta_description', coreHelpers.meta_description);
    registerThemeHelper('meta_title', coreHelpers.meta_title);
    registerThemeHelper('navigation', coreHelpers.navigation);
    registerThemeHelper('page_url', coreHelpers.page_url);
    registerThemeHelper('pagination', coreHelpers.pagination);
    registerThemeHelper('plural', coreHelpers.plural);
    registerThemeHelper('post_class', coreHelpers.post_class);
    registerThemeHelper('tags', coreHelpers.tags);
    registerThemeHelper('title', coreHelpers.title);
    registerThemeHelper('twitter_url', coreHelpers.twitter_url);
    registerThemeHelper('facebook_url', coreHelpers.facebook_url);
    registerThemeHelper('url', coreHelpers.url);

    // i18n: Stylesheet file such as /assets/css/es.css to translate content
    // by overriding. This is used in the default.hbs theme template file:
    //<link rel="stylesheet" type="text/css" href="{{theme_i18nCss}}" />
    registerThemeHelper('theme_i18nCss', i18nCss);
    
    // i18n: Translatable handlebars expressions for themes and pagination.
    // Translations are defined in files: core/server/translations/en.json, etc.
    registerThemeHelper('pagination_newerPosts', i18n.t('pagination.newerPosts'));
    registerThemeHelper('pagination_page', i18n.t('pagination.page'));
    registerThemeHelper('pagination_of', i18n.t('pagination.of'));
    registerThemeHelper('pagination_olderPosts', i18n.t('pagination.olderPosts'));
    registerThemeHelper('theme_back', i18n.t('theme.back'));
    registerThemeHelper('theme_close', i18n.t('theme.close'));
    registerThemeHelper('theme_menu', i18n.t('theme.menu'));
    registerThemeHelper('theme_on', i18n.t('theme.on'));
    registerThemeHelper('theme_noPosts', i18n.t('theme.noPosts'));
    registerThemeHelper('theme_1Post', i18n.t('theme.1Post'));
    registerThemeHelper('theme_xPosts', i18n.t('theme.xPosts'));
    registerThemeHelper('theme_1PostCollection', i18n.t('theme.1PostCollection'));
    registerThemeHelper('theme_xPostCollection', i18n.t('theme.xPostCollection'));
    registerThemeHelper('theme_proudlyPublishedWith', i18n.t('theme.proudlyPublishedWith'));
    registerThemeHelper('theme_read', i18n.t('theme.read'));
    registerThemeHelper('theme_morePosts', i18n.t('theme.morePosts'));
    registerThemeHelper('theme_byThisAuthor', i18n.t('theme.byThisAuthor'));
    registerThemeHelper('theme_scrollDown', i18n.t('theme.scrollDown'));
    registerThemeHelper('theme_shareThisPost', i18n.t('theme.shareThisPost'));
    registerThemeHelper('theme_subscribe', i18n.t('theme.subscribe'));
    registerThemeHelper('theme_subscribeTo', i18n.t('theme.subscribeTo'));
    registerThemeHelper('theme_getLatestPosts', i18n.t('theme.getLatestPosts'));
    registerThemeHelper('theme_orSubscribe', i18n.t('theme.orSubscribe'));
    registerThemeHelper('theme_viaRss', i18n.t('theme.viaRss'));
    registerThemeHelper('theme_withFeedly', i18n.t('theme.withFeedly'));
    registerThemeHelper('theme_yourEmailAddress', i18n.t('theme.yourEmailAddress'));

    // Async theme helpers
    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);
    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);
    registerAsyncThemeHelper('next_post', coreHelpers.next_post);
    registerAsyncThemeHelper('prev_post', coreHelpers.prev_post);
    registerAsyncThemeHelper('get', coreHelpers.get);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerAllCoreHelpers;
