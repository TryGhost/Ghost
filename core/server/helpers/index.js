var downsize        = require('downsize'),
    hbs             = require('express-hbs'),
    moment          = require('moment'),
    polyglot        = require('node-polyglot').instance,
    _               = require('lodash'),
    when            = require('when'),

    api             = require('../api'),
    config          = require('../config'),
    errors          = require('../errors'),
    filters         = require('../filters'),
    template        = require('./template'),
    schema          = require('../data/schema').checks,

    assetTemplate   = _.template('<%= source %>?v=<%= version %>'),
    linkTemplate    = _.template('<a href="<%= url %>"><%= text %></a>'),
    scriptTemplate  = _.template('<script src="<%= source %>?v=<%= version %>"></script>'),
    isProduction    = process.env.NODE_ENV === 'production',

    coreHelpers     = {},
    registerHelpers,

    scriptFiles = {
        production: [
            'vendor.min.js',
            'ghost.min.js',
        ],
        development: [
            'vendor-dev.js',
            'templates-dev.js',
            'ghost-dev.js'
        ]
    };

if (!isProduction) {
    hbs.handlebars.logger.level = 0;
}

 // [ description]
 //
 // @param  {Object} context date object
 // @param  {*} options
 // @return {Object} A Moment time / date object

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
// `{{page_url 2}}`
//
// Returns the URL for the page specified in the current object
// context.
//
coreHelpers.page_url = function (context, block) {
    /*jshint unused:false*/
    var url = config.paths.subdir;

    if (this.tagSlug !== undefined) {
        url += '/tag/' + this.tagSlug;
    }

    if (this.authorSlug !== undefined) {
        url += '/author/' + this.authorSlug;
    }

    if (context > 1) {
        url += '/page/' + context;
    }

    url += '/';

    return url;
};

// ### Page URL Helper: DEPRECATED
//
// *Usage example:*
// `{{pageUrl 2}}`
//
// Returns the URL for the page specified in the current object
// context. This helper is deprecated and will be removed in future versions.
//
coreHelpers.pageUrl = function (context, block) {
    errors.logWarn('Warning: pageUrl is deprecated, please use page_url instead\n' +
                    'The helper pageUrl has been replaced with page_url in Ghost 0.4.2, and will be removed entirely in Ghost 0.6\n' +
                    'In your theme\'s pagination.hbs file, pageUrl should be renamed to page_url');

    /*jshint unused:false*/
    var self = this;

    return coreHelpers.page_url.call(self, context, block);
};

// ### URL helper
//
// *Usage example:*
// `{{url}}`
// `{{url absolute="true"}}`
//
// Returns the URL for the current object context
// i.e. If inside a post context will return post permalink
// absolute flag outputs absolute URL, else URL is relative
coreHelpers.url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return config.urlForPost(api.settings, this, absolute);
    }

    if (schema.isTag(this)) {
        return when(config.urlFor('tag', {tag: this}, absolute));
    }

    if (schema.isUser(this)) {
        return when(config.urlFor('author', {author: this}, absolute));
    }


    return when(config.urlFor(this, absolute));
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

    output += config.paths.subdir + '/';

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
    if (_.isUndefined(options)) {
        options = context;
    }

    if (options.fn) {
        return hbs.handlebars.helpers['with'].call(this, this.author, options);
    }

    var autolink = _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true,
        output = '';

    if (this.author && this.author.name) {
        if (autolink) {
            output = linkTemplate({
                url: config.urlFor('author', {author: this.author}),
                text: _.escape(this.author.name)
            });
        } else {
            output = _.escape(this.author.name);
        }
    }

    return new hbs.handlebars.SafeString(output);
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
    options = options || {};
    options.hash = options.hash || {};

    var autolink = options.hash && _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true,
        separator = options.hash && _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix = options.hash && _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix = options.hash && _.isString(options.hash.suffix) ? options.hash.suffix : '',
        output = '';

    function createTagList(tags) {
        var tagNames = _.pluck(tags, 'name');

        if (autolink) {
            return _.map(tags, function (tag) {
                return linkTemplate({
                    url: config.urlFor('tag', {tag: tag}),
                    text: _.escape(tag.name)
                });
            }).join(separator);
        }
        return _.escape(tagNames.join(separator));
    }

    if (this.tags && this.tags.length) {
        output = prefix + createTagList(this.tags) + suffix;
    }

    return new hbs.handlebars.SafeString(output);
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

coreHelpers.title = function () {
    return  new hbs.handlebars.SafeString(hbs.handlebars.Utils.escapeExpression(this.title || ''));
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
// `{{file_storage}}`
//
// Returns the config value for fileStorage.
coreHelpers.file_storage = function (context, options) {
    /*jshint unused:false*/
    if (config.hasOwnProperty('fileStorage')) {
        return _.isObject(config.fileStorage) ? 'true' : config.fileStorage.toString();
    }
    return 'true';
};

// ### Apps helper
//
// *Usage example:*
// `{{apps}}`
//
// Returns the config value for apps.
coreHelpers.apps = function (context, options) {
    /*jshint unused:false*/
    if (config.hasOwnProperty('apps')) {
        return config.apps.toString();
    }
    return 'false';
};

// ### Blog Url helper
//
// *Usage example:*
// `{{blog_url}}`
//
// Returns the config value for url.
coreHelpers.blog_url = function (context, options) {
    /*jshint unused:false*/
    return config.theme().url.toString();
};

coreHelpers.ghost_script_tags = function () {
    var scriptList = isProduction ? scriptFiles.production : scriptFiles.development;

    scriptList = _.map(scriptList, function (fileName) {
        return scriptTemplate({
            source: config.paths.subdir + '/ghost/scripts/' + fileName,
            version: coreHelpers.assetHash
        });
    });

    return scriptList.join('');
};

/*
 * Asynchronous Theme Helpers (Registered with registerAsyncThemeHelper)
 */

coreHelpers.body_class = function (options) {
    /*jshint unused:false*/
    var classes = [],
        post = this.post,
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (_.isString(this.relativeUrl) && this.relativeUrl.match(/\/(page\/\d)/)) {
        classes.push('archive-template');
    } else if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
        classes.push('home-template');
    } else if (post) {
        classes.push('post-template');
    }

    if (this.tag !== undefined) {
        classes.push('tag-template');
        classes.push('tag-' + this.tag.slug);
    }

    if (this.author !== undefined) {
        classes.push('author-template');
        classes.push('author-' + this.author.slug);
    }

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    if (page) {
        classes.push('page');
    }

    return api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function (response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value],
            view;

        if (post) {
            view = template.getThemeViewForPost(paths, post).split('-');

            // If this is a page and we have a custom page template
            // then we need to modify the class name we inject
            // e.g. 'page-contact' is outputted as 'page-template-contact'
            if (view[0] === 'page' && view.length > 1) {
                view.splice(1, 0, 'template');
                classes.push(view.join('-'));
            }
        }

        return filters.doFilter('body_class', classes).then(function (classes) {
            var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
            return new hbs.handlebars.SafeString(classString.trim());
        });
    });
};

coreHelpers.post_class = function (options) {
    /*jshint unused:false*/
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
    /*jshint unused:false*/
    var self = this,
        blog = config.theme(),
        head = [],
        majorMinor = /^(\d+\.)?(\d+)/,
        trimmedVersion = this.version;

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

    head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');

    head.push('<link rel="alternate" type="application/rss+xml" title="' +
        _.escape(blog.title)  + '" href="' + config.urlFor('rss') + '">');

    return coreHelpers.url.call(self, {hash: {absolute: true}}).then(function (url) {
        head.push('<link rel="canonical" href="' + url + '" />');

        return filters.doFilter('ghost_head', head);
    }).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

coreHelpers.ghost_foot = function (options) {
    /*jshint unused:false*/
    var jquery = isProduction ? 'jquery.min.js' : 'jquery.js',
        foot = [];

    foot.push(scriptTemplate({
        source: config.paths.subdir + '/public/' + jquery,
        version: coreHelpers.assetHash
    }));

    return filters.doFilter('ghost_foot', foot).then(function (foot) {
        var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    });
};

coreHelpers.meta_title = function (options) {
    /*jshint unused:false*/
    var title = '',
        blog;

    if (_.isString(this.relativeUrl)) {
        blog = config.theme();
        if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '' || this.relativeUrl.match(/\/page/)) {
            title = blog.title;
        } else if (this.post) {
            title = this.post.title;
        } else if (this.tag) {
            title = this.tag.name + ' - ' + blog.title;
        } else if (this.author) {
            title = this.author.name + ' - ' + blog.title;
        }
    }

    return filters.doFilter('meta_title', title).then(function (title) {
        title = title || '';
        return title.trim();
    });
};

coreHelpers.meta_description = function (options) {
    /*jshint unused:false*/
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
        description = description || '';
        return description.trim();
    });
};

/**
 * Localised string helpers
 *
 * @param {String} key
 * @param {String} default translation
 * @param {Object} options
 * @return {String} A correctly internationalised string
 */
coreHelpers.e = function (key, defaultString, options) {
    var output;
    return when.all([
        api.settings.read('defaultLang'),
        api.settings.read('forceI18n')
    ]).then(function (values) {
        if (values[0].settings[0] === 'en_US' &&
                _.isEmpty(options.hash) &&
                values[1].settings[0] !== 'true') {
            output = defaultString;
        } else {
            output = polyglot.t(key, options.hash);
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
        ret = '',
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

// ### Has Helper
// `{{#has tag="video, music"}}`
// `{{#has author="sam, pat"}}`
// Checks whether a post has at least one of the tags
coreHelpers.has = function (options) {
    options = options || {};
    options.hash = options.hash || {};

    var tags = _.pluck(this.tags, 'name'),
        author = this.author ? this.author.name : null,
        tagList = options.hash.tag || false,
        authorList = options.hash.author || false,
        tagsOk,
        authorOk;

    function evaluateTagList(expr, tags) {
        return expr.split(',').map(function (v) {
            return v.trim();
        }).reduce(function (p, c) {
            return p || (_.findIndex(tags, function (item) {
                // Escape regex special characters
                item = item.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, '\\$&');
                item = new RegExp(item, 'i');
                return item.test(c);
            }) !== -1);
        }, false);
    }

    function evaluateAuthorList(expr, author) {
        var authorList =  expr.split(',').map(function (v) {
            return v.trim().toLocaleLowerCase();
        });

        return _.contains(authorList, author.toLocaleLowerCase());
    }

    if (!tagList && !authorList) {
        errors.logWarn('Invalid or no attribute given to has helper');
        return;
    }

    tagsOk = tagList && evaluateTagList(tagList, tags) || false;
    authorOk = authorList && evaluateAuthorList(authorList, author) || false;

    if (tagsOk || authorOk) {
        return options.fn(this);
    }
    return options.inverse(this);
};

// ### Pagination Helper
// `{{pagination}}`
// Outputs previous and next buttons, along with info about the current page
coreHelpers.pagination = function (options) {
    /*jshint unused:false*/
    if (!_.isObject(this.pagination) || _.isFunction(this.pagination)) {
        return errors.logAndThrowError('pagination data is not an object or is a function');
    }

    if (_.isUndefined(this.pagination.page) || _.isUndefined(this.pagination.pages) ||
            _.isUndefined(this.pagination.total) || _.isUndefined(this.pagination.limit)) {
        return errors.logAndThrowError('All values must be defined for page, pages, limit and total');
    }

    if ((!_.isNull(this.pagination.next) && !_.isNumber(this.pagination.next)) ||
            (!_.isNull(this.pagination.prev) && !_.isNumber(this.pagination.prev))) {
        return errors.logAndThrowError('Invalid value, Next/Prev must be a number');
    }

    if (!_.isNumber(this.pagination.page) || !_.isNumber(this.pagination.pages) ||
            !_.isNumber(this.pagination.total) || !_.isNumber(this.pagination.limit)) {
        return errors.logAndThrowError('Invalid value, check page, pages, limit and total are numbers');
    }

    var context = _.merge({}, this.pagination);

    if (this.tag !== undefined) {
        context.tagSlug = this.tag.slug;
    }

    if (this.author !== undefined) {
        context.authorSlug = this.author.slug;
    }

    return template.execute('pagination', context);
};

// ## Pluralize strings depending on item count
// {{plural 0 empty='No posts' singular='% post' plural='% posts'}}
// The 1st argument is the numeric variable which the helper operates on
// The 2nd argument is the string that will be output if the variable's value is 0
// The 3rd argument is the string that will be output if the variable's value is 1
// The 4th argument is the string that will be output if the variable's value is 2+
// coreHelpers.plural = function (number, empty, singular, plural) {
coreHelpers.plural = function (context, options) {
    if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
        _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
        return errors.logAndThrowError('All values must be defined for empty, singular and plural');
    }

    if (context === 0) {
        return new hbs.handlebars.SafeString(options.hash.empty);
    } else if (context === 1) {
        return new hbs.handlebars.SafeString(options.hash.singular.replace("%", context));
    } else if (context >= 2) {
        return new hbs.handlebars.SafeString(options.hash.plural.replace("%", context));
    }
};

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError('Missing helper: "' + arg + '"');
};

// ## Admin URL helper
// uses urlFor to generate a URL for either the admin or the frontend.
coreHelpers.admin_url = function (options) {
    var absolute = options && options.hash && options.hash.absolute,
        // Ghost isn't a named route as currently it violates the must start-and-end with slash rule
        context = !options || !options.hash || !options.hash.frontend ? {relativeUrl: '/ghost'} : 'home';

    return config.urlFor(context, absolute);
};

// Register an async handlebars helper for a given handlebars instance
function registerAsyncHelper(hbs, name, fn) {
    hbs.registerAsyncHelper(name, function (options, cb) {
        // Wrap the function passed in with a when.resolve so it can
        // return either a promise or a value
        when.resolve(fn.call(this, options)).then(function (result) {
            cb(result);
        }).otherwise(function (err) {
            errors.logAndThrowError(err, 'registerAsyncThemeHelper: ' + name);
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



registerHelpers = function (adminHbs, assetHash) {

    // Expose hbs instance for admin
    coreHelpers.adminHbs = adminHbs;

    // Store hash for assets
    coreHelpers.assetHash = assetHash;


    // Register theme helpers
    registerThemeHelper('asset', coreHelpers.asset);

    registerThemeHelper('author', coreHelpers.author);

    registerThemeHelper('content', coreHelpers.content);

    registerThemeHelper('title', coreHelpers.title);

    registerThemeHelper('date', coreHelpers.date);

    registerThemeHelper('encode', coreHelpers.encode);

    registerThemeHelper('excerpt', coreHelpers.excerpt);

    registerThemeHelper('foreach', coreHelpers.foreach);

    registerThemeHelper('has', coreHelpers.has);

    registerThemeHelper('page_url', coreHelpers.page_url);

    registerThemeHelper('pageUrl', coreHelpers.pageUrl);

    registerThemeHelper('pagination', coreHelpers.pagination);

    registerThemeHelper('tags', coreHelpers.tags);

    registerThemeHelper('plural', coreHelpers.plural);

    registerAsyncThemeHelper('body_class', coreHelpers.body_class);

    registerAsyncThemeHelper('e', coreHelpers.e);

    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);

    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);

    registerAsyncThemeHelper('meta_description', coreHelpers.meta_description);

    registerAsyncThemeHelper('meta_title', coreHelpers.meta_title);

    registerAsyncThemeHelper('post_class', coreHelpers.post_class);

    registerAsyncThemeHelper('url', coreHelpers.url);


    // Register admin helpers
    registerAdminHelper('ghost_script_tags', coreHelpers.ghost_script_tags);

    registerAdminHelper('asset', coreHelpers.asset);

    registerAdminHelper('apps', coreHelpers.apps);

    registerAdminHelper('file_storage', coreHelpers.file_storage);

    registerAdminHelper('blog_url', coreHelpers.blog_url);
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
module.exports.registerThemeHelper = registerThemeHelper;
module.exports.registerAsyncThemeHelper = registerAsyncThemeHelper;
module.exports.scriptFiles = scriptFiles;
