var downsize        = require('downsize'),
    hbs             = require('express-hbs'),
    moment          = require('moment'),
    path            = require('path'),
    polyglot        = require('node-polyglot').instance,
    _               = require('underscore'),
    when            = require('when'),

    api             = require('../api'),
    config          = require('../config'),
    errors          = require('../errorHandling'),
    filters         = require('../filters'),
    template        = require('./template'),
    schema          = require('../data/schema').checks,
    updateCheck     = require('../update-check'),

    assetTemplate   = _.template('<%= source %>?v=<%= version %>'),
    scriptTemplate  = _.template('<script src="<%= source %>?v=<%= version %>"></script>'),
    isProduction    = process.env.NODE_ENV === 'production',

    coreHelpers     = {},
    registerHelpers,

    scriptFiles = {
        production: [
            'ghost.min.js'
        ],
        development: [
            'vendor.js',
            'helpers.js',
            'templates.js',
            'models.js',
            'views.js'
        ]
    };

/**
 * [ description]
 * @todo ghost core helpers + a way for themes to register them
 * @param  {Object} context date object
 * @param  {*} options
 * @return {Object} A Moment time / date object
 */
coreHelpers.date = function (context, options) {
    if (!options && context.hasOwnProperty('hash')) {
        options = context;
        context = undefined;

        // set to published_at by default, if it's available
        // otherwise, this will print the current date
        if (this.published_at) {
            context = this.published_at;
        }
    }

    // ensure that context is undefined, not null, as that can cause errors
    context = context === null ? undefined : context;

    var f = options.hash.format || 'MMM Do, YYYY',
        timeago = options.hash.timeago,
        date;


    if (timeago) {
        date = moment(context).fromNow();
    } else {
        date = moment(context).format(f);
    }
    return date;
};

//
// ### URI Encoding helper
//
// *Usage example:*
// `{{encode uri}}`
//
// Returns URI encoded string
//
coreHelpers.encode = function (context, str) {
    var uri = context || str;
    return new hbs.handlebars.SafeString(encodeURIComponent(uri));
};

// ### Page URL Helper
//
// *Usage example:*
// `{{pageUrl 2}}`
//
// Returns the URL for the page specified in the current object
// context.
//
coreHelpers.pageUrl = function (context, block) {
    /*jslint unparam:true*/
    return config.paths().subdir + (context === 1 ? '/' : ('/page/' + context + '/'));
};

// ### URL helper
//
// *Usage example:*
// `{{url}}`
// `{{url absolute}}`
//
// Returns the URL for the current object context
// i.e. If inside a post context will return post permalink
// absolute flag outputs absolute URL, else URL is relative
coreHelpers.url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return config.paths.urlForPost(api.settings, this, absolute);
    }

    return when(config.paths.urlFor(this, absolute));
};

// ### Asset helper
//
// *Usage example:*
// `{{asset "css/screen.css"}}`
// `{{asset "css/screen.css" ghost="true"}}`
// Returns the path to the specified asset. The ghost
// flag outputs the asset path for the Ghost admin
coreHelpers.asset = function (context, options) {
    var output = '',
        isAdmin = options && options.hash && options.hash.ghost;

    output += config.paths().subdir + '/';

    if (!context.match(/^favicon\.ico$/) && !context.match(/^shared/) && !context.match(/^asset/)) {
        if (isAdmin) {
            output += 'ghost/';
        } else {
            output += 'assets/';
        }
    }

    // Get rid of any leading slash on the context
    context = context.replace(/^\//, '');
    output += context;

    if (!context.match(/^favicon\.ico$/)) {
        output = assetTemplate({
            source: output,
            version: coreHelpers.assetHash
        });
    }

    return new hbs.handlebars.SafeString(output);
};

// ### Author Helper
//
// *Usage example:*
// `{{author}}`
//
// Returns the full name of the author of a given post, or a blank string
// if the author could not be determined.
//
coreHelpers.author = function (context, options) {
    /*jslint unparam:true*/
    return this.author ? this.author.name : '';
};

// ### Tags Helper
//
// *Usage example:*
// `{{tags}}`
// `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
// and can be used for more complex templates.
coreHelpers.tags = function (options) {
    var separator = _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix = _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix = _.isString(options.hash.suffix) ? options.hash.suffix : '',
        output = '',
        tagNames = _.pluck(this.tags, 'name');

    if (tagNames.length) {
        output = prefix + tagNames.join(separator) + suffix;
    }

    return output;
};

// ### Content Helper
//
// *Usage example:*
// `{{content}}`
// `{{content words="20"}}`
// `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.
//
// **returns** SafeString content html, complete or truncated.
//
coreHelpers.content = function (options) {
    var truncateOptions = (options || {}).hash || {};
    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    if (truncateOptions.hasOwnProperty('words') || truncateOptions.hasOwnProperty('characters')) {
        // Due to weirdness in downsize the 'words' option
        // must be passed as a string. refer to #1796
        // TODO: when downsize fixes this quirk remove this hack.
        if (truncateOptions.hasOwnProperty('words')) {
            truncateOptions.words = truncateOptions.words.toString();
        }
        return new hbs.handlebars.SafeString(
            downsize(this.html, truncateOptions)
        );
    }

    return new hbs.handlebars.SafeString(this.html);
};

// ### Excerpt Helper
//
// *Usage example:*
// `{{excerpt}}`
// `{{excerpt words="50"}}`
// `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"
//
// **returns** SafeString truncated, HTML-free content.
//
coreHelpers.excerpt = function (options) {
    var truncateOptions = (options || {}).hash || {},
        excerpt;

    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    /*jslint regexp:true */
    excerpt = String(this.html).replace(/<\/?[^>]+>/gi, '');
    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    /*jslint regexp:false */

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    return new hbs.handlebars.SafeString(
        downsize(excerpt, truncateOptions)
    );
};

// ### Filestorage helper
//
// *Usage example:*
// `{{fileStorage}}`
//
// Returns the config value for fileStorage.
coreHelpers.fileStorage = function (context, options) {
    /*jslint unparam:true*/
    if (config().hasOwnProperty('fileStorage')) {
        return config().fileStorage.toString();
    }
    return "true";
};

coreHelpers.ghostScriptTags = function () {
    var scriptList = isProduction ? scriptFiles.production : scriptFiles.development;

    scriptList = _.map(scriptList, function (fileName) {
        return scriptTemplate({
            source: config.paths().subdir + '/ghost/scripts/' + fileName,
            version: coreHelpers.assetHash
        });
    });

    return scriptList.join('');
};

/*
 * Asynchronous Theme Helpers (Registered with registerAsyncThemeHelper)
 */

coreHelpers.body_class = function (options) {
    /*jslint unparam:true*/
    var classes = [],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (_.isString(this.relativeUrl) && this.relativeUrl.match(/\/page/)) {
        classes.push('archive-template');
    } else if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
        classes.push('home-template');
    } else {
        classes.push('post-template');
    }

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    if (page) {
        classes.push('page');
    }

    return filters.doFilter('body_class', classes).then(function (classes) {
        var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    });
};

coreHelpers.post_class = function (options) {
    /*jslint unparam:true*/
    var classes = ['post'],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        featured = this.post && this.post.featured ? this.post.featured : this.featured || false,
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    if (featured) {
        classes.push('featured');
    }

    if (page) {
        classes.push('page');
    }

    return filters.doFilter('post_class', classes).then(function (classes) {
        var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    });
};

coreHelpers.ghost_head = function (options) {
    /*jslint unparam:true*/
    var self = this,
        blog = config.theme(),
        head = [],
        majorMinor = /^(\d+\.)?(\d+)/,
        trimmedVersion = this.version;

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

    head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');

    head.push('<link rel="alternate" type="application/rss+xml" title="'
        + _.escape(blog.title)  + '" href="' + config.paths.urlFor('rss') + '">');

    return coreHelpers.url.call(self, {hash: {absolute: true}}).then(function (url) {
        head.push('<link rel="canonical" href="' + url + '" />');

        return filters.doFilter('ghost_head', head);
    }).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

coreHelpers.ghost_foot = function (options) {
    /*jslint unparam:true*/
    var foot = [];

    foot.push(scriptTemplate({
        source: config.paths().subdir + '/shared/vendor/jquery/jquery.js',
        version: coreHelpers.assetHash
    }));

    return filters.doFilter('ghost_foot', foot).then(function (foot) {
        var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    });
};

coreHelpers.meta_title = function (options) {
    /*jslint unparam:true*/
    var title = "",
        blog;

    if (_.isString(this.relativeUrl)) {
        if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '' || this.relativeUrl.match(/\/page/)) {
            blog = config.theme();
            title = blog.title;
        } else if (this.post) {
            title = this.post.title;
        }
    }

    return filters.doFilter('meta_title', title).then(function (title) {
        title = title || "";
        return new hbs.handlebars.SafeString(title.trim());
    });
};

coreHelpers.meta_description = function (options) {
    /*jslint unparam:true*/
    var description,
        blog;

    if (_.isString(this.relativeUrl)) {
        if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '' || this.relativeUrl.match(/\/page/)) {
            blog = config.theme();
            description = blog.description;
        } else {
            description = '';
        }
    }

    return filters.doFilter('meta_description', description).then(function (description) {
        description = description || "";
        return new hbs.handlebars.SafeString(description.trim());
    });
};

/**
 * Localised string helpers
 *
 * @param String key
 * @param String default translation
 * @param {Object} options
 * @return String A correctly internationalised string
 */
coreHelpers.e = function (key, defaultString, options) {
    var output;
    when.all([
        api.settings.read('defaultLang'),
        api.settings.read('forceI18n')
    ]).then(function (values) {
        if (values[0].value === 'en'
                && _.isEmpty(options.hash)
                && _.isEmpty(values[1].value)) {
            output = defaultString;
        } else {
            output = polyglot().t(key, options.hash);
        }
        return output;
    });
};

coreHelpers.foreach = function (context, options) {
    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        j = 0,
        columns = options.hash.columns,
        key,
        ret = "",
        data;

    if (options.data) {
        data = hbs.handlebars.createFrame(options.data);
    }

    function setKeys(_data, _i, _j, _columns) {
        if (_i === 0) {
            _data.first = true;
        }
        if (_i === _j - 1) {
            _data.last = true;
        }
        // first post is index zero but still needs to be odd
        if (_i % 2 === 1) {
            _data.even = true;
        } else {
            _data.odd = true;
        }
        if (_i % _columns === 0) {
            _data.rowStart = true;
        } else if (_i % _columns === (_columns - 1)) {
            _data.rowEnd = true;
        }
        return _data;
    }
    if (context && typeof context === 'object') {
        if (context instanceof Array) {
            for (j = context.length; i < j; i += 1) {
                if (data) {
                    data.index = i;
                    data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                    data = setKeys(data, i, j, columns);
                }
                ret = ret + fn(context[i], { data: data });
            }
        } else {
            for (key in context) {
                if (context.hasOwnProperty(key)) {
                    j += 1;
                }
            }
            for (key in context) {
                if (context.hasOwnProperty(key)) {
                    if (data) {
                        data.key = key;
                        data.first = data.rowEnd = data.rowStart = data.last = data.even = data.odd = false;
                        data = setKeys(data, i, j, columns);
                    }
                    ret = ret + fn(context[key], {data: data});
                    i += 1;
                }
            }
        }
    }

    if (i === 0) {
        ret = inverse(this);
    }
    return ret;
};

// ### Pagination Helper
// `{{pagination}}`
// Outputs previous and next buttons, along with info about the current page
coreHelpers.pagination = function (options) {
    /*jslint unparam:true*/
    if (!_.isObject(this.pagination) || _.isFunction(this.pagination)) {
        errors.logAndThrowError('pagination data is not an object or is a function');
        return;
    }
    if (_.isUndefined(this.pagination.page) || _.isUndefined(this.pagination.pages)
            || _.isUndefined(this.pagination.total) || _.isUndefined(this.pagination.limit)) {
        errors.logAndThrowError('All values must be defined for page, pages, limit and total');
        return;
    }
    if ((!_.isUndefined(this.pagination.next) && !_.isNumber(this.pagination.next))
            || (!_.isUndefined(this.pagination.prev) && !_.isNumber(this.pagination.prev))) {
        errors.logAndThrowError('Invalid value, Next/Prev must be a number');
        return;
    }
    if (!_.isNumber(this.pagination.page) || !_.isNumber(this.pagination.pages)
            || !_.isNumber(this.pagination.total) || !_.isNumber(this.pagination.limit)) {
        errors.logAndThrowError('Invalid value, check page, pages, limit and total are numbers');
        return;
    }
    return template.execute('pagination', this.pagination);
};

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError('Missing helper: "' + arg + '"');
};

// ## Admin URL helper
// uses urlFor to generate a URL for either the admin or the frontend.
coreHelpers.adminUrl = function (options) {
    var absolute = options && options.hash && options.hash.absolute,
        // Ghost isn't a named route as currently it violates the must start-and-end with slash rule
        context = !options || !options.hash || !options.hash.frontend ? {relativeUrl: '/ghost'} : 'home';

    return config.paths.urlFor(context, absolute);
};

coreHelpers.updateNotification = function (options) {
    var output = '';

    if (config().updateCheck === false || !this.currentUser) {
        return when(output);
    }

    return updateCheck.showUpdateNotification().then(function (result) {
        if (result) {
            if (options && options.hash && options.hash.classOnly) {
                output = ' update-available';
            } else {
                output = '<div class="notification-success">' +
                    'A new version of Ghost is available! Hot damn. ' +
                    '<a href="http://ghost.org/download">Upgrade now</a></div>';
            }
        }

        return output;
    });
};

// Register an async handlebars helper for a given handlebars instance
function registerAsyncHelper(hbs, name, fn) {
    hbs.registerAsyncHelper(name, function (options, cb) {
        // Wrap the function passed in with a when.resolve so it can
        // return either a promise or a value
        when.resolve(fn.call(this, options)).then(function (result) {
            cb(result);
        }).otherwise(function (err) {
            errors.logAndThrowError(err, "registerAsyncThemeHelper: " + name);
        });
    });
}

// Register a handlebars helper for themes
function registerThemeHelper(name, fn) {
    hbs.registerHelper(name, fn);
}

// Register an async handlebars helper for themes
function registerAsyncThemeHelper(name, fn) {
    registerAsyncHelper(hbs, name, fn);
}

// Register a handlebars helper for admin
function registerAdminHelper(name, fn) {
    coreHelpers.adminHbs.registerHelper(name, fn);
}

// Register an async handlebars helper for admin
function registerAsyncAdminHelper(name, fn) {
    registerAsyncHelper(coreHelpers.adminHbs, name, fn);
}


registerHelpers = function (adminHbs, assetHash) {

    // Expose hbs instance for admin
    coreHelpers.adminHbs = adminHbs;

    // Store hash for assets
    coreHelpers.assetHash = assetHash;


    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);

    registerThemeHelper('author', coreHelpers.author);

    registerThemeHelper('content', coreHelpers.content);

    registerThemeHelper('date', coreHelpers.date);

    registerThemeHelper('encode', coreHelpers.encode);

    registerThemeHelper('excerpt', coreHelpers.excerpt);

    registerThemeHelper('foreach', coreHelpers.foreach);

    registerThemeHelper('pageUrl', coreHelpers.pageUrl);

    registerThemeHelper('pagination', coreHelpers.pagination);

    registerThemeHelper('tags', coreHelpers.tags);

    registerAsyncThemeHelper('body_class', coreHelpers.body_class);

    registerAsyncThemeHelper('e', coreHelpers.e);

    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);

    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);

    registerAsyncThemeHelper('meta_description', coreHelpers.meta_description);

    registerAsyncThemeHelper('meta_title', coreHelpers.meta_title);

    registerAsyncThemeHelper('post_class', coreHelpers.post_class);

    registerAsyncThemeHelper('url', coreHelpers.url);


    // Register admin helpers
    registerAdminHelper('asset', coreHelpers.asset);

    registerAdminHelper('ghostScriptTags', coreHelpers.ghostScriptTags);

    registerAdminHelper('fileStorage', coreHelpers.fileStorage);

    registerAdminHelper('adminUrl', coreHelpers.adminUrl);

    registerAsyncAdminHelper('updateNotification', coreHelpers.updateNotification);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
module.exports.registerThemeHelper = registerThemeHelper;
module.exports.registerAsyncThemeHelper = registerAsyncThemeHelper;
module.exports.scriptFiles = scriptFiles;
