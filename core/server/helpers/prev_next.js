// ### prevNext helper exposes methods for prev_post and next_post - separately defined in helpers index.
//  Example usages
// `{{#prev_post}}<a href ="{{url}}>previous post</a>{{/prev_post}}'
// `{{#next_post}}<a href ="{{url absolute="true">next post</a>{{/next_post}}'

var proxy = require('./proxy'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),

    logging = proxy.logging,
    i18n = proxy.i18n,
    createFrame = proxy.hbs.handlebars.createFrame,

    api = proxy.api,
    isPost = proxy.checks.isPost,

    fetch,
    buildApiOptions;

buildApiOptions = function buildApiOptions(options, post) {
    var publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss'),
        slug = post.slug,
        op = options.name === 'prev_post' ? '<=' : '>',
        order = options.name === 'prev_post' ? 'desc' : 'asc',
        apiOptions = {
            include: 'author,tags',
            order: 'published_at ' + order,
            limit: 1,
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            filter: "slug:-" + slug + "+published_at:" + op + "'" + publishedAt + "'" // eslint-disable-line quotes
        };

    if (_.get(options, 'hash.in')) {
        if (options.hash.in === 'primary_tag' && _.get(post, 'primary_tag.slug')) {
            apiOptions.filter += '+primary_tag:' + post.primary_tag.slug;
        } else if (options.hash.in === 'author' && _.get(post, 'author.slug')) {
            apiOptions.filter += '+author:' + post.author.slug;
        }
    }

    return apiOptions;
};

fetch = function fetch(options, data) {
    var self = this,
        apiOptions = buildApiOptions(options, this);

    return api.posts
        .browse(apiOptions)
        .then(function handleSuccess(result) {
            var related = result.posts[0];

            if (related) {
                return options.fn(related, {data: data});
            } else {
                return options.inverse(self, {data: data});
            }
        })
        .catch(function handleError(err) {
            logging.error(err);
            data.error = err.message;
            return options.inverse(self, {data: data});
        });
};

// If prevNext method is called without valid post data then we must return a promise, if there is valid post data
// then the promise is handled in the api call.

module.exports = function prevNext(options) {
    options = options || {};

    var data = createFrame(options.data);

    // Guard against incorrect usage of the helpers
    if (!options.fn || !options.inverse) {
        data.error = i18n.t('warnings.helpers.mustBeCalledAsBlock', {helperName: options.name});
        logging.warn(data.error);
        return Promise.resolve();
    }

    // Guard against trying to execute prev/next on previews, pages, or other resources
    if (!isPost(this) || this.status !== 'published' || this.page) {
        return Promise.resolve(options.inverse(this, {data: data}));
    }

    // With the guards out of the way, attempt to build the apiOptions, and then fetch the data
    return fetch.call(this, options, data);
};
