var _               = require('underscore'),
    moment          = require('moment'),
    downsize        = require('downsize'),
    path            = require('path'),
    when            = require('when'),
    hbs             = require('express-hbs'),
    polyglot        = require('node-polyglot').instance,
    template        = require('./template'),
    errors          = require('../errorHandling'),
    models          = require('../models'),
    filters         = require('../filters'),
    packageInfo     = require('../../../package.json'),
    version         = packageInfo.version,
    scriptTemplate  = _.template("<script src='<%= source %>?v=<%= version %>'></script>"),
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
    /*jslint unparam:true*/
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
    var output = '',
        self = this,
        tags = {
            year: function () { return self.created_at.getFullYear(); },
            month: function () { return self.created_at.getMonth() + 1; },
            day: function () { return self.created_at.getDate(); },
            slug: function () { return self.slug; },
            id: function () { return self.id; }
        },
        blog = coreHelpers.ghost.blogGlobals(),
        isAbsolute = options && options.hash.absolute;

    if (isAbsolute) {
        output += blog.url;
    }

    if (blog.path && blog.path !== '/') {
        output += blog.path;
    }

    if (models.isPost(this)) {
        output += coreHelpers.ghost.settings('permalinks');
        output = output.replace(/(:[a-z]+)/g, function (match) {
            if (_.has(tags, match.substr(1))) {
                return tags[match.substr(1)]();
            }
        });
    }

    return output;
};

// ### Asset helper
//
// *Usage example:*
// `{{asset "css/screen.css"}}`
// `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost
// flag outputs the asset path for the Ghost admin
coreHelpers.asset = function (context, options) {
    var output = '',
        subDir = coreHelpers.ghost.blogGlobals().path,
        isAdmin = options && options.hash && options.hash.ghost;

    if (subDir === '/') {
        output += '/';
    } else {
        output += subDir + '/';
    }

    if (isAdmin) {
        output += 'ghost/';
    } else {
        output += 'assets/';
    }

    output += context;
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
    if (coreHelpers.config().hasOwnProperty('fileStorage')) {
        return coreHelpers.config().fileStorage.toString();
    }
    return "true";
};

coreHelpers.ghostScriptTags = function () {
    var scriptFiles = [],
        blog = coreHelpers.ghost.blogGlobals();

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
            source: (blog.path === '/' ? '' : blog.path) + '/built/scripts/' + fileName,
            version: version
        });
    });

    return scriptFiles.join('');
};

/*
 * Asynchronous Theme Helpers (Registered with registerAsyncThemeHelper)
 */

coreHelpers.body_class = function (options) {
    /*jslint unparam:true*/
    var classes = [],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (_.isString(this.ghostRoot) && this.ghostRoot.match(/\/page/)) {
        classes.push('archive-template');
    } else if (!this.ghostRoot || this.ghostRoot === '/' || this.ghostRoot === '') {
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
    var blog = coreHelpers.ghost.blogGlobals(),
        root = blog.path === '/' ? '' : blog.path,
        head = [],
        majorMinor = /^(\d+\.)?(\d+)/,
        trimmedVersion = this.version;

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

    head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');

    head.push('<link rel="alternate" type="application/rss+xml" title="' + _.escape(blog.title)  + '" href="' + root + '/rss/' + '">');
    if (this.ghostRoot) {
        head.push('<link rel="canonical" href="' + coreHelpers.ghost.blogGlobals().url + this.ghostRoot + '" />');
    }

    return filters.doFilter('ghost_head', head).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

coreHelpers.ghost_foot = function (options) {
    /*jslint unparam:true*/
    var foot = [];
    foot.push('<script src="' + coreHelpers.ghost.blogGlobals().url + '/shared/vendor/jquery/jquery.js"></script>');

    return filters.doFilter('ghost_foot', foot).then(function (foot) {
        var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
        return new hbs.handlebars.SafeString(footString.trim());
    });
};

coreHelpers.meta_title = function (options) {
    /*jslint unparam:true*/
    var title,
        blog;
    if (_.isString(this.ghostRoot)) {
        if (!this.ghostRoot || this.ghostRoot === '/' || this.ghostRoot === '' || this.ghostRoot.match(/\/page/)) {
            blog = coreHelpers.ghost.blogGlobals();
            title = blog.title;
        } else {
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

    if (_.isString(this.ghostRoot)) {
        if (!this.ghostRoot || this.ghostRoot === '/' || this.ghostRoot === '' || this.ghostRoot.match(/\/page/)) {
            blog = coreHelpers.ghost.blogGlobals();
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

    if (coreHelpers.ghost.settings('defaultLang') === 'en' && _.isEmpty(options.hash) && !coreHelpers.ghost.settings('forceI18n')) {
        output = defaultString;
    } else {
        output = polyglot().t(key, options.hash);
    }

    return output;
};

coreHelpers.json = function (object, options) {
    /*jslint unparam:true*/
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

// ### Check if a tag is contained on the tag list
//
// Usage example:*
//
// `{{#has_tag "test"}} {{tags}} {{else}} no tags {{/has_tag}}`
//
// @param  {String} tag name to search on tag list
// @return {String} list of tags formatted according to `tag` helper
//
coreHelpers.has_tag = function (name, options) {
    if (_.isArray(this.tags) && !_.isEmpty(this.tags)) {
        return (!_.isEmpty(_.filter(this.tags, function (tag) {
            return (_.has(tag, "name") && tag.name === name);
        }))) ? options.fn(this) : options.inverse(this);
    }
    return options.inverse(this);
};

// ## Template driven helpers
// Template driven helpers require that their template is loaded before they can be registered.
coreHelpers.paginationTemplate = null;

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
    return new hbs.handlebars.SafeString(coreHelpers.paginationTemplate(this.pagination));
};

coreHelpers.helperMissing = function (arg) {
    if (arguments.length === 2) {
        return undefined;
    }
    errors.logError('Missing helper: "' + arg + '"');
};

// Register a handlebars helper for themes
function registerThemeHelper(name, fn) {
    hbs.registerHelper(name, fn);
}

// Register an async handlebars helper for themes
function registerAsyncThemeHelper(name, fn) {
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

registerHelpers = function (ghost, config) {
    var paginationHelper;

    // Expose this so our helpers can use it in their code.
    coreHelpers.ghost = ghost;

    // And expose config
    coreHelpers.config = config;

    registerThemeHelper('asset', coreHelpers.asset);

    registerThemeHelper('author', coreHelpers.author);

    registerThemeHelper('content', coreHelpers.content);

    registerThemeHelper('date', coreHelpers.date);

    registerThemeHelper('e', coreHelpers.e);

    registerThemeHelper('encode', coreHelpers.encode);

    registerThemeHelper('excerpt', coreHelpers.excerpt);

    registerThemeHelper('fileStorage', coreHelpers.fileStorage);

    registerThemeHelper('foreach', coreHelpers.foreach);

    registerThemeHelper('ghostScriptTags', coreHelpers.ghostScriptTags);

    registerThemeHelper('has_tag', coreHelpers.has_tag);

    registerThemeHelper('helperMissing', coreHelpers.helperMissing);

    registerThemeHelper('json', coreHelpers.json);

    registerThemeHelper('pageUrl', coreHelpers.pageUrl);

    registerThemeHelper('tags', coreHelpers.tags);

    registerThemeHelper('url', coreHelpers.url);

    registerAsyncThemeHelper('body_class', coreHelpers.body_class);

    registerAsyncThemeHelper('ghost_foot', coreHelpers.ghost_foot);

    registerAsyncThemeHelper('ghost_head', coreHelpers.ghost_head);

    registerAsyncThemeHelper('meta_description', coreHelpers.meta_description);

    registerAsyncThemeHelper('meta_title', coreHelpers.meta_title);

    registerAsyncThemeHelper('post_class', coreHelpers.post_class);

    paginationHelper = template.loadTemplate('pagination').then(function (templateFn) {
        coreHelpers.paginationTemplate = templateFn;

        registerThemeHelper('pagination', coreHelpers.pagination);
    });

    // Return once the template-driven helpers have loaded
    return when.join(
        paginationHelper
    );
};

module.exports = coreHelpers;
module.exports.loadCoreHelpers = registerHelpers;
module.exports.registerThemeHelper = registerThemeHelper;
module.exports.registerAsyncThemeHelper = registerAsyncThemeHelper;
