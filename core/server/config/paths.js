// Contains all path information to be used throughout
// the codebase.

var moment            = require('moment'),
    path              = require('path'),
    when              = require('when'),
    url               = require('url'),
    _                 = require('underscore'),
    requireTree       = require('../require-tree'),
    appRoot           = path.resolve(__dirname, '../../../'),
    corePath          = path.resolve(appRoot, 'core/'),
    contentPath       = path.resolve(appRoot, 'content/'),
    themePath         = path.resolve(contentPath + '/themes'),
    pluginPath        = path.resolve(contentPath + '/plugins'),
    themeDirectories  = requireTree(themePath),
    pluginDirectories = requireTree(pluginPath),
    localPath = '',
    configUrl = '',

    availableThemes,
    availablePlugins;


function paths() {
    var subdir = localPath === '/' ? '' : localPath;

    return {
        'appRoot':          appRoot,
        'subdir':           subdir,
        'config':           path.join(appRoot, 'config.js'),
        'configExample':    path.join(appRoot, 'config.example.js'),
        'contentPath':      contentPath,
        'corePath':         corePath,
        'themePath':        themePath,
        'pluginPath':       pluginPath,
        'imagesPath':       path.resolve(contentPath, 'images/'),
        'imagesRelPath':    'content/images',
        'adminViews':       path.join(corePath, '/server/views/'),
        'helperTemplates':  path.join(corePath, '/server/helpers/tpl/'),
        'exportPath':       path.join(corePath, '/server/data/export/'),
        'lang':             path.join(corePath, '/shared/lang/'),
        'debugPath':        subdir + '/ghost/debug/',
        'availableThemes':  availableThemes,
        'availablePlugins': availablePlugins,
        'builtScriptPath':  path.join(corePath, 'built/scripts/')
    };
}

// TODO: remove configURL and give direct access to config object?
// TODO: not called when executing tests
function update(configURL) {
    configUrl = configURL;
    localPath = url.parse(configURL).path;

    // Remove trailing slash
    if (localPath !== '/') {
        localPath = localPath.replace(/\/$/, '');
    }

    return when.all([themeDirectories, pluginDirectories]).then(function (paths) {
        availableThemes = paths[0];
        availablePlugins = paths[1];
        return;
    });
}

// ## createUrl
// Simple url creation from a given path
// Ensures that our urls contain the subdirectory if there is one
// And are correctly formatted as either relative or absolute
// Usage:
// createUrl('/', true) -> http://my-ghost-blog.com/
// E.g. /blog/ subdir
// createUrl('/welcome-to-ghost/') -> /blog/welcome-to-ghost/
// Parameters:
// - urlPath - string which must start and end with a slash
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
// Returns:
//  - a URL which always ends with a slash
function createUrl(urlPath, absolute) {
    urlPath = urlPath || '/';
    absolute = absolute || false;

    var output = '';

    // create base of url, always ends without a slash
    if (absolute) {
        output += configUrl.replace(/\/$/, '');
    } else {
        output += paths().subdir;
    }

    // append the path, always starts and ends with a slash
    output += urlPath;

    return output;
}

// ## urlPathForPost
// Always sync
// Creates the url path for a post, given a post and a permalink
// Parameters:
// - post - a json object representing a post
// - permalinks - a json object containing the permalinks setting
function urlPathForPost(post, permalinks) {
    var output = '',
        tags = {
            year:   function () { return moment(post.published_at).format('YYYY'); },
            month:  function () { return moment(post.published_at).format('MM'); },
            day:    function () { return moment(post.published_at).format('DD'); },
            slug: function () { return post.slug; },
            id: function () { return post.id; }
        };

    if (post.page === 1) {
        output += '/:slug/';
    } else {
        output += permalinks.value;
    }

    // replace tags like :slug or :year with actual values
    output = output.replace(/(:[a-z]+)/g, function (match) {
        if (_.has(tags, match.substr(1))) {
            return tags[match.substr(1)]();
        }
    });

    return output;
}

// ## urlFor
// Synchronous url creation for a given context
// Can generate a url for a named path, given path, or known object (post)
// Determines what sort of context it has been given, and delegates to the correct generation method,
// Finally passing to createUrl, to ensure any subdirectory is honoured, and the url is absolute if needed
// Usage:
// urlFor('home', true) -> http://my-ghost-blog.com/
// E.g. /blog/ subdir
// urlFor({relativeUrl: '/my-static-page/') -> /blog/my-static-page/
// E.g. if post object represents welcome post, and slugs are set to standard
// urlFor('post', {...}) -> /welcome-to-ghost/
// E.g. if post object represents welcome post, and slugs are set to date
// urlFor('post', {...}) -> /2014/01/01/welcome-to-ghost/
// Parameters:
// - context - a string, or json object describing the context for which you need a url
// - data (optional) - a json object containing data needed to generate a url
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
// This is probably not the right place for this, but it's the best place for now
function urlFor(context, data, absolute) {
    var urlPath = '/',
        knownObjects = ['post', 'tag', 'user'],
        knownPaths = {'home': '/', 'rss': '/rss/'}; // this will become really big

    // Make data properly optional
    if (_.isBoolean(data)) {
        absolute = data;
        data = null;
    }

    if (_.isObject(context) && context.relativeUrl) {
        urlPath = context.relativeUrl;
    } else if (_.isString(context) && _.indexOf(knownObjects, context) !== -1) {
        // trying to create a url for an object
        if (context === 'post' && data.post && data.permalinks) {
            urlPath = urlPathForPost(data.post, data.permalinks);
        }
        // other objects are recognised but not yet supported
    } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
        // trying to create a url for a named path
        urlPath = knownPaths[context] || '/';
    }

    return createUrl(urlPath, absolute);
}

// ## urlForPost
// This method is async as we have to fetch the permalinks
// Get the permalink setting and then get a URL for the given post
// Parameters
// - settings - passed reference to api.settings
// - post - a json object representing a post
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
function urlForPost(settings, post, absolute) {
    return settings.read('permalinks').then(function (permalinks) {
        return urlFor('post', {post: post, permalinks: permalinks}, absolute);
    });
}

module.exports = paths;
module.exports.update = update;
module.exports.urlFor = urlFor;
module.exports.urlForPost = urlForPost;
