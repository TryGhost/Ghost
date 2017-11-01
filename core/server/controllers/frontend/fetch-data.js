/**
 * # Fetch Data
 * Dynamically build and execute queries on the API for channels
 */
var api = require('../../api'),
    _   = require('lodash'),
    Promise = require('bluebird'),
    themes = require('../../themes'),
    queryDefaults,
    defaultPostQuery = {};

// The default settings for a default post query
queryDefaults = {
    type: 'browse',
    resource: 'posts',
    options: {}
};

// Default post query needs to always include author & tags
_.extend(defaultPostQuery, queryDefaults, {
    options: {
        include: 'author,tags'
    }
});

/**
 * ## Fetch Posts Per page
 * Grab the postsPerPage setting
 *
 * @param {Object} options
 * @returns {Object} postOptions
 */
function fetchPostsPerPage(options) {
    options = options || {};

    var postsPerPage = parseInt(themes.getActive().config('posts_per_page'));

    // No negative posts per page, must be number
    if (!isNaN(postsPerPage) && postsPerPage > 0) {
        options.limit = postsPerPage;
    }

    // Ensure the options key is present, so this can be merged with other options
    return {options: options};
}

/**
 * @typedef query
 * @
 */

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

    // Replace any slugs
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
 *
 * @param {Object} channelOptions
 * @returns {Promise} response
 */
function fetchData(channelOptions) {
    // @TODO improve this further
    var pageOptions = channelOptions.isRSS ?
            {options: channelOptions.postOptions} : fetchPostsPerPage(channelOptions.postOptions),
        postQuery,
        props = {};

    // All channels must have a posts query, use the default if not provided
    postQuery = _.defaultsDeep({}, pageOptions, defaultPostQuery);
    props.posts = processQuery(postQuery, channelOptions.slugParam);

    _.each(channelOptions.data, function (query, name) {
        props[name] = processQuery(query, channelOptions.slugParam);
    });

    return Promise.props(props).then(function formatResponse(results) {
        var response = _.cloneDeep(results.posts);
        delete results.posts;

        // process any remaining data
        if (!_.isEmpty(results)) {
            response.data = {};

            _.each(results, function (result, name) {
                if (channelOptions.data[name].type === 'browse') {
                    response.data[name] = result;
                } else {
                    response.data[name] = result[channelOptions.data[name].resource];
                }
            });
        }

        return response;
    });
}

module.exports = fetchData;
