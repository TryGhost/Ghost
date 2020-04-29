/**
 * # Fetch Data
 * Dynamically build and execute queries on the API
 */
const _ = require('lodash');
const Promise = require('bluebird');

// The default settings for a default post query
// @TODO: get rid of this config and use v2, v3 config
const queryDefaults = {
    type: 'browse',
    resource: 'posts',
    controller: 'postsPublic',
    options: {}
};

/**
 * The theme expects to have access to the relations by default e.g. {{post.authors}}
 */
const defaultQueryOptions = {
    options: {
        include: 'authors,tags'
    }
};

const defaultDataQueryOptions = {
    post: _.cloneDeep(defaultQueryOptions),
    page: _.cloneDeep(defaultQueryOptions),
    tag: null,
    author: null
};

const defaultPostQuery = _.cloneDeep(queryDefaults);
defaultPostQuery.options = defaultQueryOptions.options;

/**
 * @description Process query request.
 *
 * Takes a 'query' object, ensures that type, resource and options are set
 * Replaces occurrences of `%s` in options with slugParam
 * Converts the query config to a promise for the result
 *
 * @param {Object} query
 * @param {String} slugParam
 * @returns {Promise}
 */
function processQuery(query, slugParam, locals) {
    const api = require('../../../../server/api')[locals.apiVersion];

    query = _.cloneDeep(query);

    _.defaultsDeep(query, queryDefaults);

    // Replace any slugs, see TaxonomyRouter. We replace any '%s' by the slug
    _.each(query.options, function (option, name) {
        query.options[name] = _.isString(option) ? option.replace(/%s/g, slugParam) : option;
    });

    query.options.context = {member: locals.member};

    return (api[query.controller] || api[query.resource])[query.type](query.options);
}

/**
 * @description Fetch data from API helper for controllers.
 *
 * Calls out to get posts per page, builds the final posts query & builds any additional queries
 * Wraps the queries using Promise.props to ensure it gets named responses
 * Does a first round of formatting on the response, and returns
 */
function fetchData(pathOptions, routerOptions, locals) {
    pathOptions = pathOptions || {};
    routerOptions = routerOptions || {};

    let postQuery = _.cloneDeep(defaultPostQuery);
    let props = {};

    if (routerOptions.filter) {
        postQuery.options.filter = routerOptions.filter;
    }

    if (routerOptions.order) {
        postQuery.options.order = routerOptions.order;
    }

    if (Object.prototype.hasOwnProperty.call(pathOptions, 'page')) {
        postQuery.options.page = pathOptions.page;
    }

    if (Object.prototype.hasOwnProperty.call(pathOptions, 'limit')) {
        postQuery.options.limit = pathOptions.limit;
    }

    // CASE: always fetch post entries
    // The filter can in theory contain a "%s" e.g. filter="primary_tag:%s"
    props.posts = processQuery(postQuery, pathOptions.slug, locals);

    // CASE: fetch more data defined by the router e.g. tags, authors - see TaxonomyRouter
    _.each(routerOptions.data, function (query, name) {
        const dataQueryOptions = _.merge(query, defaultDataQueryOptions[name]);
        props[name] = processQuery(dataQueryOptions, pathOptions.slug, locals);
    });

    return Promise.props(props)
        .then(function formatResponse(results) {
            const response = _.cloneDeep(results.posts);

            if (routerOptions.data) {
                response.data = {};

                _.each(routerOptions.data, function (config, name) {
                    response.data[name] = results[name][config.resource];

                    if (config.type === 'browse') {
                        response.data[name].meta = results[name].meta;
                        // @TODO remove in v3
                        response.data[name][config.resource] = results[name][config.resource];
                    }
                });
            }

            return response;
        });
}

module.exports = fetchData;
