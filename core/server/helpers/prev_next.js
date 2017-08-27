// ### prevNext helper exposes methods for prev_post and next_post - separately defined in helpers index.
//  Example usages
// `{{#prev_post}}<a href ="{{url}}>previous post</a>{{/prev_post}}'
// `{{#next_post}}<a href ="{{url absolute="true">next post</a>{{/next_post}}'

var proxy = require('./proxy'),
    Promise = require('bluebird'),

    logging = proxy.logging,
    i18n = proxy.i18n,
    createFrame = proxy.hbs.handlebars.createFrame,

    api = proxy.api,
    isPost = proxy.checks.isPost,

    fetch;

fetch = function fetch(apiOptions, options, data) {
    var self = this;

    return api.posts
        .read(apiOptions)
        .then(function handleSuccess(result) {
            var related = result.posts[0];

            if (related.previous) {
                return options.fn(related.previous, {data: data});
            } else if (related.next) {
                return options.fn(related.next, {data: data});
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

    var data = createFrame(options.data),
        apiOptions = {
            include: options.name === 'prev_post' ? 'previous,previous.author,previous.tags' : 'next,next.author,next.tags'
        };

    if (!options.fn) {
        data.error = i18n.t('warnings.helpers.mustBeCalledAsBlock', {helperName: options.name});
        logging.warn(data.error);
        return Promise.resolve();
    }

    if (isPost(this) && this.status === 'published') {
        apiOptions.slug = this.slug;
        return fetch(apiOptions, options, data);
    } else {
        return Promise.resolve(options.inverse(this, {data: data}));
    }
};
