/**
 * # Fetch Data
 * Dynamically build and execute queries on the API
 */
const _ = require('lodash');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const { applyLimitCap } = require('../../../shared/max-limit-cap');
const { resolveApiCall, resolveRouteData } = require('../routing/api-adapter');

/**
 * The theme expects to have access to the relations by default e.g. {{post.authors}}
 */
const defaultQueryOptions = {
  options: {
    include: 'authors,tags,tiers',
  },
};

const defaultDataQueryOptions = {
  post: _.cloneDeep(defaultQueryOptions),
  page: _.cloneDeep(defaultQueryOptions),
  tag: null,
  author: null,
};

const defaultPostQuery = {
  ...resolveApiCall({ type: 'browse', resource: 'posts' }),
  options: _.cloneDeep(defaultQueryOptions.options),
};

const loggedListingLimits = new Set();

/**
 * Get the limit for a listing page.
 *
 * Theme `posts_per_page` and routes.yaml `limit` aren't capped like the Content API
 * and {{#get}}, so log once per process when one is over the max limit.
 *
 * @param {string|number} limit
 * @param {Object} routerOptions
 * @returns {string|number}
 */
function getListingLimit(limit, routerOptions) {
  const cappedLimit = applyLimitCap(limit);

  if (cappedLimit !== limit) {
    const source = routerOptions.limit ? 'routes.yaml' : 'theme';
    const key = `${source}:${limit}`;

    if (!loggedListingLimits.has(key)) {
      loggedListingLimits.add(key);
      logging.info(
        {
          system: {
            event: 'listing.limit_over_max',
            source,
            limit,
            max_limit: cappedLimit,
          },
        },
        `Listing page limit ${limit} from ${source} is over the max limit of ${cappedLimit}`,
      );
    }

    // Opt-in, because capping by default would break themes that show every post
    if (config.get('optimization:capListingLimit')) {
      return cappedLimit;
    }
  }

  return limit;
}

/**
 * Process query request.
 *
 * Takes a resolved query spec, which already carries type, resource,
 * controller and options.
 * Replaces occurrences of `%s` in options with slugParam
 * Converts the query config to a promise for the result
 *
 * @param {Object} query
 * @param {string} slugParam
 * @returns {Promise}
 */
function processQuery(query, slugParam, locals) {
  const api = require('../proxy').api;

  query = _.cloneDeep(query);

  // Replace any slugs, see TaxonomyRouter. We replace any '%s' by the slug
  _.each(query.options, function (option, name) {
    query.options[name] = _.isString(option) ? option.replace(/%s/g, slugParam) : option;
  });

  query.options.context = { member: locals.member };

  return (api[query.controller] || api[query.resource])[query.type](query.options);
}

/**
 * Fetch data from API helper for controllers.
 *
 * Calls out to get posts per page, builds the final posts query & builds any additional queries
 * Uses Promise.all to handle the queries and ensure concurrent execution.
 * Does a first round of formatting on the response, and returns
 */
async function fetchData(pathOptions, routerOptions, locals) {
  pathOptions = pathOptions || {};
  routerOptions = routerOptions || {};

  const postQuery = _.cloneDeep(defaultPostQuery);
  const promises = [];

  if (routerOptions.filter) {
    postQuery.options.filter = routerOptions.filter;
  }

  if (routerOptions.order) {
    postQuery.options.order = routerOptions.order;
  }

  if (Object.hasOwn(pathOptions, 'page')) {
    postQuery.options.page = pathOptions.page;
  }

  if (Object.hasOwn(pathOptions, 'limit')) {
    postQuery.options.limit = getListingLimit(pathOptions.limit, routerOptions);
  }

  // CASE: always fetch post entries
  // The filter can in theory contain a "%s" e.g. filter="primary_tag:%s"
  promises.push(processQuery(postQuery, pathOptions.slug, locals));

  const apiCalls = resolveRouteData(routerOptions.data);

  // CASE: fetch more data defined by the router e.g. tags, authors - see TaxonomyRouter
  _.each(apiCalls, function (apiCall, name) {
    // Merge into a fresh object: the resolved spec is read again below to
    // shape the response, so it must stay as the adapter resolved it.
    const dataQueryOptions = _.merge({}, apiCall, defaultDataQueryOptions[name]);
    promises.push(processQuery(dataQueryOptions, pathOptions.slug, locals));
  });

  const results = await Promise.all(promises);
  const response = _.cloneDeep(results[0]);

  if (routerOptions.data) {
    response.data = {};

    let resultIndex = 1;

    _.each(apiCalls, function (apiCall, name) {
      if (results[resultIndex]) {
        response.data[name] = results[resultIndex][apiCall.resource];

        if (apiCall.type === 'browse') {
          response.data[name].meta = results[resultIndex].meta;
        }

        resultIndex = resultIndex + 1;
      }
    });
  }

  return response;
}

module.exports = fetchData;
