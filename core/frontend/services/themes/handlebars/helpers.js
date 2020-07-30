const register = require('./register');
const coreHelpers = require('../../../helpers');
const glob = require('glob');
const path = require('path');
const registerThemeHelper = register.registerThemeHelper;
const registerAsyncThemeHelper = register.registerAsyncThemeHelper;

let registerAllCoreHelpers, registerCustomHelpers;

registerAllCoreHelpers = function registerAllCoreHelpers() {
    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);
    registerThemeHelper('author', coreHelpers.author);
    registerThemeHelper('authors', coreHelpers.authors);
    registerThemeHelper('body_class', coreHelpers.body_class);
    registerThemeHelper('cancel_link', coreHelpers.cancel_link);
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
    registerThemeHelper('price', coreHelpers.price);
    registerThemeHelper('raw', coreHelpers.raw);
    registerThemeHelper('reading_time', coreHelpers.reading_time);
    registerThemeHelper('t', coreHelpers.t);
    registerThemeHelper('tags', coreHelpers.tags);
    registerThemeHelper('title', coreHelpers.title);
    registerThemeHelper('twitter_url', coreHelpers.twitter_url);
    registerThemeHelper('facebook_url', coreHelpers.facebook_url);
    registerThemeHelper('url', coreHelpers.url);

    // Async theme helpers
    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);
    registerAsyncThemeHelper('next_post', coreHelpers.prev_post);
    registerAsyncThemeHelper('prev_post', coreHelpers.prev_post);
    registerAsyncThemeHelper('get', coreHelpers.get);
};

registerCustomHelpers = function registerCustomHelpers(active) {
    const helpersPath = active.helpersPath;
    const themeRoot = active.path;

    const helpers = {};

    // We use glob here because it's already a dependency
    // If we want to get rid of glob we could use E.g. requiredir
    // Or require('fs').readdirSync(__dirname + '/')
    let helperFiles = glob.sync('*.js', {cwd: helpersPath});
    helperFiles.forEach((helper) => {
        let name = helper.replace(/.js$/, '');
        helpers[name] = require(path.join(helpersPath, helper));

        registerThemeHelper(name, helpers[name]);
    });

}

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerAllCoreHelpers;
module.exports.loadCustomHelpers = registerCustomHelpers;
