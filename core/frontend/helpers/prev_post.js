// ### prevNext helper exposes methods for prev_post and next_post - separately defined in helpers index.
//  Example usages
// `{{#prev_post}}<a href ="{{url}}>previous post</a>{{/prev_post}}'
// `{{#next_post}}<a href ="{{url absolute="true">next post</a>{{/next_post}}'

const {logging, i18n, api, hbs, checks} = require('../services/proxy');
const get = require('lodash/get');
const Promise = require('bluebird');
const moment = require('moment');

const createFrame = hbs.handlebars.createFrame;

const buildApiOptions = function buildApiOptions(options, post) {
    const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');
    const slug = post.slug;
    const op = options.name === 'prev_post' ? '<=' : '>';
    const order = options.name === 'prev_post' ? 'desc' : 'asc';

    const apiOptions = {
        /**
         * @deprecated: single authors was superceded by multiple authors in Ghost 1.22.0
         */
        include: 'author,authors,tags',
        order: 'published_at ' + order,
        limit: 1,
        // This line deliberately uses double quotes because GQL cannot handle either double quotes
        // or escaped singles, see TryGhost/GQL#34
        filter: "slug:-" + slug + "+published_at:" + op + "'" + publishedAt + "'" // eslint-disable-line quotes
    };

    if (get(options, 'hash.in')) {
        if (options.hash.in === 'primary_tag' && get(post, 'primary_tag.slug')) {
            apiOptions.filter += '+primary_tag:' + post.primary_tag.slug;
        } else if (options.hash.in === 'primary_author' && get(post, 'primary_author.slug')) {
            apiOptions.filter += '+primary_author:' + post.primary_author.slug;
        } else if (options.hash.in === 'author' && get(post, 'author.slug')) {
            apiOptions.filter += '+author:' + post.author.slug;
        }
    }

    return apiOptions;
};

const fetch = function fetch(options, data) {
    const self = this;
    const apiOptions = buildApiOptions(options, this);
    const apiVersion = data.root._locals.apiVersion;

    // @TODO: https://github.com/TryGhost/Ghost/issues/10548
    const controller = api[apiVersion].postsPublic || api[apiVersion].posts;

    return controller
        .browse(apiOptions)
        .then(function handleSuccess(result) {
            const related = result.posts[0];

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

    const data = createFrame(options.data);
    const context = options.data.root.context;

    // Guard against incorrect usage of the helpers
    if (!options.fn || !options.inverse) {
        data.error = i18n.t('warnings.helpers.mustBeCalledAsBlock', {helperName: options.name});
        logging.warn(data.error);
        return Promise.resolve();
    }

    if (context.includes('preview')) {
        return Promise.resolve(options.inverse(this, {data: data}));
    }

    // Guard against trying to execute prev/next on pages, or other resources
    if (!checks.isPost(this) || this.page) {
        return Promise.resolve(options.inverse(this, {data: data}));
    }

    // With the guards out of the way, attempt to build the apiOptions, and then fetch the data
    return fetch.call(this, options, data);
};
