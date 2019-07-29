var coreHelpers = {},
    register = require('./register'),
    registerThemeHelper = register.registerThemeHelper,
    registerAsyncThemeHelper = register.registerAsyncThemeHelper,
    registerAllCoreHelpers;

coreHelpers.asset = require('./asset');
coreHelpers.author = require('./author');
coreHelpers.authors = require('./authors');
coreHelpers.body_class = require('./body_class');
coreHelpers.concat = require('./concat');
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
coreHelpers.lang = require('./lang');
coreHelpers.link = require('./link');
coreHelpers.link_class = require('./link_class');
coreHelpers.meta_description = require('./meta_description');
coreHelpers.meta_title = require('./meta_title');
coreHelpers.navigation = require('./navigation');
coreHelpers.page_url = require('./page_url');
coreHelpers.pagination = require('./pagination');
coreHelpers.plural = require('./plural');
coreHelpers.post_class = require('./post_class');
coreHelpers.prev_post = require('./prev_next');
coreHelpers.next_post = require('./prev_next');
coreHelpers.reading_time = require('./reading_time');
coreHelpers.t = require('./t');
coreHelpers.tags = require('./tags');
coreHelpers.title = require('./title');
coreHelpers.twitter_url = require('./twitter_url');
coreHelpers.url = require('./url');

registerAllCoreHelpers = function registerAllCoreHelpers() {
    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);
    registerThemeHelper('author', coreHelpers.author);
    registerThemeHelper('authors', coreHelpers.authors);
    registerThemeHelper('body_class', coreHelpers.body_class);
    registerThemeHelper('concat', coreHelpers.concat);
    registerThemeHelper('content', coreHelpers.content);
    registerThemeHelper('date', coreHelpers.date);
    registerThemeHelper('encode', coreHelpers.encode);
    registerThemeHelper('excerpt', coreHelpers.excerpt);
    registerThemeHelper('foreach', coreHelpers.foreach);
    registerThemeHelper('ghost_foot', coreHelpers.ghost_foot);
    registerThemeHelper('has', coreHelpers.has);
    registerThemeHelper('is', coreHelpers.is);
    registerThemeHelper('img_url', coreHelpers.img_url);
    registerThemeHelper('lang', coreHelpers.lang);
    registerThemeHelper('link', coreHelpers.link);
    registerThemeHelper('link_class', coreHelpers.link_class);
    registerThemeHelper('meta_description', coreHelpers.meta_description);
    registerThemeHelper('meta_title', coreHelpers.meta_title);
    registerThemeHelper('navigation', coreHelpers.navigation);
    registerThemeHelper('page_url', coreHelpers.page_url);
    registerThemeHelper('pagination', coreHelpers.pagination);
    registerThemeHelper('plural', coreHelpers.plural);
    registerThemeHelper('post_class', coreHelpers.post_class);
    registerThemeHelper('reading_time', coreHelpers.reading_time);
    registerThemeHelper('t', coreHelpers.t);
    registerThemeHelper('tags', coreHelpers.tags);
    registerThemeHelper('title', coreHelpers.title);
    registerThemeHelper('twitter_url', coreHelpers.twitter_url);
    registerThemeHelper('facebook_url', coreHelpers.facebook_url);
    registerThemeHelper('url', coreHelpers.url);

    // Async theme helpers
    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);
    registerAsyncThemeHelper('next_post', coreHelpers.next_post);
    registerAsyncThemeHelper('prev_post', coreHelpers.prev_post);
    registerAsyncThemeHelper('get', coreHelpers.get);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerAllCoreHelpers;
