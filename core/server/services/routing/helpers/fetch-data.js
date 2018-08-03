/**
 * # Fetch Data
 * Dynamically build and execute queries on the API
 */
const _ = require('lodash'),
    Promise = require('bluebird'),
    api = require('../../../api'),
    defaultPostQuery = {};

// The default settings for a default post query
const queryDefaults = {
    type: 'browse',
    resource: 'posts',
    options: {}
};

/**
 * Default post query needs to always include author, authors & tags
 *
 * @deprecated: `author`, will be removed in Ghost 3.0
 */
_.extend(defaultPostQuery, queryDefaults, {
    options: {
        include: 'author,authors,tags'
    }
});

/**
 * ## Process Query
 * Takes a 'query' object, ensures that type, resource and options are set
 * Replaces occurrences of `%s` in options with slugParam
 * Converts the query config to a promise for the result
 *
 * @param {{type: String, resource: String, options: Object}} query
 * @param {String} slugParam
 * @returns {Promise} promise for an API call
 */
function processQuery(query, slugParam) {
    query = _.cloneDeep(query);

    // Ensure that all the properties are filled out
    _.defaultsDeep(query, queryDefaults);

    // Replace any slugs, see TaxonomyRouter. We replace any '%s' by the slug
    _.each(query.options, function (option, name) {
        query.options[name] = _.isString(option) ? option.replace(/%s/g, slugParam) : option;
    });

    // Return a promise for the api query
    return api[query.resource][query.type](query.options);
}

/**
 * ## Fetch Data
 * Calls out to get posts per page, builds the final posts query & builds any additional queries
 * Wraps the queries using Promise.props to ensure it gets named responses
 * Does a first round of formatting on the response, and returns
 */
function fetchData(pathOptions, routerOptions) {
    pathOptions = pathOptions || {};
    routerOptions = routerOptions || {};

    let postQuery = _.cloneDeep(defaultPostQuery),
        props = {};

    if (routerOptions.filter) {
        postQuery.options.filter = routerOptions.filter;
    }

    if (routerOptions.order) {
        postQuery.options.order = routerOptions.order;
    }

    if (pathOptions.hasOwnProperty('page')) {
        postQuery.options.page = pathOptions.page;
    }

    if (pathOptions.hasOwnProperty('limit')) {
        postQuery.options.limit = pathOptions.limit;
    }

    // CASE: always fetch post entries
    // The filter can in theory contain a "%s" e.g. filter="primary_tag:%s"
    props.posts = processQuery(postQuery, pathOptions.slug);

    // CASE: fetch more data defined by the router e.g. tags, authors - see TaxonomyRouter
    _.each(routerOptions.data, function (query, name) {
        props[name] = processQuery(query, pathOptions.slug);
    });

    return Promise.props(props)
        .then(function formatResponse(results) {
            const response = _.cloneDeep(results.posts);

            if (routerOptions.data) {
                response.data = {};

                _.each(routerOptions.data, function (config, name) {
                    if (config.type === 'browse') {
                        response.data[name] = results[name];
                    } else {
                        response.data[name] = results[name][config.resource];
                    }
                });
            }

            return response;
        });
}

module.exports = fetchData;
