var _               = require('underscore'),
    moment          = require('moment'),
    downsize        = require('downsize'),
    when            = require('when'),
    hbs             = require('express-hbs'),
    errors          = require('../errorHandling'),
    models          = require('../models'),
    packageInfo     = require('../../../package.json'),
    version         = packageInfo.version,
    scriptTemplate  = _.template("<script src='/built/scripts/<%= name %>?v=<%= version %>'></script>"),
    isProduction    = process.env.NODE_ENV === 'production',
    coreHelpers     = {},
    registerHelpers;

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
    return context === 1 ? '/' : ('/page/' + context + '/');
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
    var output = '';

    if (options && options.hash.absolute) {
        output += coreHelpers.ghost.config().url;
    }

    if (models.isPost(this)) {
        output += '/' + this.slug + '/';
    }

    return output;
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
// `{{content words=20}}`
// `{{content characters=256}}`
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

    if (truncateOptions.words || truncateOptions.characters) {
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
// `{{excerpt words=50}}`
// `{{excerpt characters=256}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words=50
//
// **returns** SafeString truncated, HTML-free content.
//
coreHelpers.excerpt = function (options) {
    var truncateOptions = (options || {}).hash || {},
        excerpt;

    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);

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
    if (coreHelpers.ghost.config().hasOwnProperty('fileStorage')) {
        return coreHelpers.ghost.config().fileStorage.toString();
    }
    return "true";
};

coreHelpers.ghostScriptTags = function () {
    var scriptFiles = [];

    if (isProduction) {
        scriptFiles.push("ghost.min.js");
    } else {
        scriptFiles = [
            'vendor.js',
            'helpers.js',
            'templates.js',
            'models.js',
            'views.js'
        ];
    }

    scriptFiles = _.map(scriptFiles, function (fileName) {
        return scriptTemplate({
            name: fileName,
            version: version
        });
    });

    return scriptFiles.join('');
};

/*
 * Asynchronous Theme Helpers (Registered with ghost.registerAsyncThemeHelper)
 */

coreHelpers.body_class = function (options) {
    var classes = [],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (_.isString(this.path) && this.path.match(/\/page/)) {
        classes.push('archive-template');
    } else if (!this.path || this.path === '/' || this.path === '') {
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

    return coreHelpers.ghost.doFilter('body_class', classes).then(function (classes) {
        var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    });
};

coreHelpers.post_class = function (options) {
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

    return coreHelpers.ghost.doFilter('post_class', classes).then(function (classes) {
        var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(classString.trim());
    });
};

coreHelpers.ghost_head = function (options) {
    var head = [],
        majorMinor = /^(\d+\.)?(\d+)/,
        trimmedVersion = this.version;

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

    head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');
    head.push('<link rel="alternate" type="application/rss+xml" title="RSS" href="/rss/">');

    return coreHelpers.ghost.doFilter('ghost_head', head).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

coreHelpers.ghost_foot = function (options) {
    var foot = [];
    foot.push('<script src="/shared/vendor/jquery/jquery.js"></script>');

    return coreHelpers.ghost.doFilter('ghost_foot', foot).then(function (foot) {
        var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    });
};

coreHelpers.meta_title = function (options) {
    var title,
        blog;
    if (_.isString(this.path)) {
        if (!this.path || this.path === '/' || this.path === '' || this.path.match(/\/page/)) {
            blog = coreHelpers.ghost.blogGlobals();
            title = blog.title;
        } else {
            title = this.post.title;
        }
    }

    return coreHelpers.ghost.doFilter('meta_title', title).then(function (title) {
        title = title || "";
        return new hbs.handlebars.SafeString(title.trim());
    });
};

coreHelpers.meta_description = function (options) {
    var description,
        blog;

    if (_.isString(this.path)) {
        if (!this.path || this.path === '/' || this.path === '' || this.path.match(/\/page/)) {
            blog = coreHelpers.ghost.blogGlobals();
            description = blog.description;
        } else {
            description = '';
        }
    }

    return coreHelpers.ghost.doFilter('meta_description', description).then(function (description) {
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

    if (coreHelpers.ghost.settings('defaultLang') === 'en' && _.isEmpty(options.hash) && !coreHelpers.ghost.settings('forceI18n')) {
        output = defaultString;
    } else {
        output = coreHelpers.ghost.polyglot().t(key, options.hash);
    }

    return output;
};

coreHelpers.json = function (object, options) {
    return JSON.stringify(object);
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

// ## Template driven helpers
// Template driven helpers require that their template is loaded before they can be registered.
coreHelpers.paginationTemplate = null;

// ### Pagination Helper
// `{{pagination}}`
// Outputs previous and next buttons, along with info about the current page
coreHelpers.pagination = function (options) {
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
    return new hbs.handlebars.SafeString(coreHelpers.paginationTemplate(this.pagination));
};

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError('Missing helper: "' + arg + '"');
};

registerHelpers = function (ghost) {
    var paginationHelper;

    // Expose this so our helpers can use it in their code.
    coreHelpers.ghost = ghost;

    ghost.registerThemeHelper('date', coreHelpers.date);

    ghost.registerThemeHelper('encode', coreHelpers.encode);

    ghost.registerThemeHelper('pageUrl', coreHelpers.pageUrl);

    ghost.registerThemeHelper('url', coreHelpers.url);

    ghost.registerThemeHelper('author', coreHelpers.author);

    ghost.registerThemeHelper('tags', coreHelpers.tags);

    ghost.registerThemeHelper('content', coreHelpers.content);

    ghost.registerThemeHelper('excerpt', coreHelpers.excerpt);

    ghost.registerThemeHelper('fileStorage', coreHelpers.fileStorage);

    ghost.registerThemeHelper('ghostScriptTags', coreHelpers.ghostScriptTags);

    ghost.registerThemeHelper('e', coreHelpers.e);

    ghost.registerThemeHelper('json', coreHelpers.json);

    ghost.registerThemeHelper('foreach', coreHelpers.foreach);

    ghost.registerThemeHelper('helperMissing', coreHelpers.helperMissing);

    ghost.registerAsyncThemeHelper('body_class', coreHelpers.body_class);

    ghost.registerAsyncThemeHelper('post_class', coreHelpers.post_class);

    ghost.registerAsyncThemeHelper('meta_title', coreHelpers.meta_title);

    ghost.registerAsyncThemeHelper('meta_description', coreHelpers.meta_description);

    ghost.registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);

    ghost.registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);

    paginationHelper = ghost.loadTemplate('pagination').then(function (templateFn) {
        coreHelpers.paginationTemplate = templateFn;

        ghost.registerThemeHelper('pagination', coreHelpers.pagination);
    });

    // Return once the template-driven helpers have loaded
    return when.join(
        paginationHelper
    );
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
