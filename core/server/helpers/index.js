var _ = require('underscore'),
    moment = require('moment'),
    downsize = require('downsize'),
    when = require('when'),
    hbs = require('express-hbs'),
    errors = require('../errorHandling'),
    models = require('../models'),
    coreHelpers;


coreHelpers = function (ghost) {
    var navHelper,
        paginationHelper;

    /**
     * [ description]
     * @todo ghost core helpers + a way for themes to register them
     * @param  {Object} context date object
     * @param  {*} options
     * @return {Object} A Moment time / date object
     */
    ghost.registerThemeHelper('date', function (context, options) {
        if (!options && context.hasOwnProperty('hash')) {
            options = context;
            context = undefined;

            // set to published_at by default, if it's available
            // otherwise, this will print the current date
            if (this.published_at) {
                context = this.published_at;
            }
        }

        var f = options.hash.format || "MMM Do, YYYY",
            timeago = options.hash.timeago,
            date;


        if (timeago) {
            date = moment(context).fromNow();
        } else {
            date = moment(context).format(f);
        }
        return date;
    });

    // ### URL helper
    //
    // *Usage example:*
    // `{{url}}`
    // `{{url absolute}}`
    //
    // Returns the URL for the current object context
    // i.e. If inside a post context will return post permalink
    // absolute flag outputs absolute URL, else URL is relative
    ghost.registerThemeHelper('url', function (context, options) {
        var output = '';

        if (options && options.absolute) {
            output += ghost.config().env[process.NODE_ENV].url;
        }
        if (models.isPost(this)) {
            output += "/" + this.slug;
        }
        return output;
    });

    // ### Author Helper
    // 
    // *Usage example:*
    // `{{author}}`
    // 
    // Returns the full name of the author of a given post, or a blank string
    // if the author could not be determined.
    //
    ghost.registerThemeHelper('author', function (context, options) {
        return this.author ? this.author.full_name : "";
    });

    // ### Tags Helper
    //
    // *Usage example:*
    // `{{tags}}`
    // `{{tags separator=" - "}}`
    //
    // Returns a string of the tags on the post.
    // By default, tags are separated by commas.
    //
    // Note that the standard {{#each tags}} implementation is unaffected by this helper
    // and can be used for more complex templates.
    ghost.registerThemeHelper('tags', function (options) {
        var separator = ", ",
            tagNames;

        if (typeof options.hash.separator === "string") {
            separator = options.hash.separator;
        }

        tagNames = _.pluck(this.tags, 'name');
        return tagNames.join(separator);
    });

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
    ghost.registerThemeHelper('content', function (options) {
        var truncateOptions = (options || {}).hash || {};
        truncateOptions = _.pick(truncateOptions, ["words", "characters"]);

        if (truncateOptions.words || truncateOptions.characters) {
            return new hbs.handlebars.SafeString(
                downsize(this.content, truncateOptions)
            );
        }

        return new hbs.handlebars.SafeString(this.content);
    });


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
    ghost.registerThemeHelper('excerpt', function (options) {
        var truncateOptions = (options || {}).hash || {},
            excerpt;

        truncateOptions = _.pick(truncateOptions, ["words", "characters"]);

        /*jslint regexp:true */
        excerpt = String(this.content).replace(/<\/?[^>]+>/gi, "");
        /*jslint regexp:false */

        if (!truncateOptions.words && !truncateOptions.characters) {
            truncateOptions.words = 50;
        }

        return new hbs.handlebars.SafeString(
            downsize(excerpt, truncateOptions)
        );
    });


    ghost.registerThemeHelper('body_class', function (options) {
        var classes = [];
        if (_.isString(this.path) && this.path.match(/\/page/)) {
            classes.push('archive-template');
        } else if (!this.path || this.path === '/' || this.path === '') {
            classes.push('home-template');
        } else {
            classes.push('post-template');
        }

        return ghost.doFilter('body_class', classes, function (classes) {
            var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
            return new hbs.handlebars.SafeString(classString.trim());
        });
    });

    ghost.registerThemeHelper('post_class', function (options) {
        var classes = ['post'];

        if (this.tags) {
            classes = classes.concat(this.tags.map(function (tag) { return "tag-" + tag.name; }));
        }

        return ghost.doFilter('post_class', classes, function (classes) {
            var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
            return new hbs.handlebars.SafeString(classString.trim());
        });
    });

    ghost.registerThemeHelper('ghost_head', function (options) {
        var head = [];
        head.push('<meta name="generator" content="Ghost ' + this.version + '" />');
        head.push('<link rel="alternate" type="application/rss+xml" title="RSS" href="/rss/">');

        return ghost.doFilter('ghost_head', head, function (head) {
            var headString = _.reduce(head, function (memo, item) { return memo + "\n" + item; }, '');
            return new hbs.handlebars.SafeString(headString.trim());
        });
    });

    ghost.registerThemeHelper('ghost_foot', function (options) {
        var foot = [];
        foot.push('<script src="/shared/vendor/jquery/jquery.js"></script>');

        return ghost.doFilter('ghost_foot', foot, function (foot) {
            var footString = _.reduce(foot, function (memo, item) { return memo + ' ' + item; }, '');
            return new hbs.handlebars.SafeString(footString.trim());
        });
    });
    /**
     * [ description]
     *
     * @param String key
     * @param String default translation
     * @param {Object} options
     * @return String A correctly internationalised string
     */
    ghost.registerThemeHelper('e', function (key, defaultString, options) {
        var output;

        if (ghost.settings().defaultLang === 'en' && _.isEmpty(options.hash) && !ghost.settings().forceI18n) {
            output = defaultString;
        } else {
            output = ghost.polyglot().t(key, options.hash);
        }

        return output;
    });

    ghost.registerThemeHelper('json', function (object, options) {
        return JSON.stringify(object);
    });

    ghost.registerThemeHelper('foreach', function (context, options) {
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
    });

    // ## Template driven helpers
    // Template driven helpers require that their template is loaded before they can be registered.

    // ###Nav Helper
    // `{{nav}}`
    // Outputs a navigation menu built from items in config.js
    navHelper = ghost.loadTemplate('nav').then(function (templateFn) {
        ghost.registerThemeHelper('nav', function (options) {
            if (!_.isObject(this.navItems) || _.isFunction(this.navItems)) {
                errors.logAndThrowError('navItems data is not an object or is a function');
                return;
            }
            return new hbs.handlebars.SafeString(templateFn({links: this.navItems}));
        });
    });

    // ### Pagination Helper
    // `{{pagination}}`
    // Outputs previous and next buttons, along with info about the current page
    paginationHelper = ghost.loadTemplate('pagination').then(function (templateFn) {
        ghost.registerThemeHelper('pagination', function (options) {
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
            return new hbs.handlebars.SafeString(templateFn(this.pagination));
        });
    });

    ghost.registerThemeHelper('helperMissing', function (arg) {
        if (arguments.length === 2) {
            return undefined;
        }
        errors.logError("Missing helper: '" + arg + "'");
    });
    // Return once the template-driven helpers have loaded
    return when.join(
        navHelper,
        paginationHelper
    );
};

module.exports.loadCoreHelpers = coreHelpers;
