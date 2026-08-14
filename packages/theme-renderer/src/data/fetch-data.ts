/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/data/fetch-data.js @ 407e032dc7 —
// transforms: CJS → ESM; lazy `require('../proxy').api` → the seam's call-time
// `api` proxy (same lazy-resolution semantics).
/**
 * # Fetch Data
 * Dynamically build and execute queries on the API
 */
import _ from '../utils/lodash.ts';
import {resolveApiCall, resolveRouteData} from '../routing/api-adapter.ts';
import {api} from '../seam/proxy.ts';

/**
 * The theme expects to have access to the relations by default e.g. {{post.authors}}
 */
const defaultQueryOptions = {
    options: {
        include: 'authors,tags,tiers'
    }
};

const defaultDataQueryOptions: Record<string, any> = {
    post: _.cloneDeep(defaultQueryOptions),
    page: _.cloneDeep(defaultQueryOptions),
    tag: null,
    author: null
};

const defaultPostQuery = {
    ...resolveApiCall({type: 'browse', resource: 'posts'}),
    options: _.cloneDeep(defaultQueryOptions.options)
};

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
function processQuery(query: any, slugParam: string | undefined, locals: any) {
    // PERF (worker-readiness): upstream cloneDeep'd the query here. Queries
    // are tiny (a spec plus a flat options map of primitives), so owning them
    // with a shallow-safe clone at this boundary is effectively free and makes
    // the no-leak guarantee local to this function instead of a contract on
    // every caller. (The expensive clone that was removed — the 1–3MB posts
    // payload — stays removed; see fetchData below.)
    query = {...query, options: {...query.options}};

    // Replace any slugs, see TaxonomyRouter. We replace any '%s' by the slug
    _.each(query.options, function (option: any, name: string) {
        query.options[name] = _.isString(option) ? option.replace(/%s/g, slugParam as string) : option;
    });

    query.options.context = {member: locals.member};

    return (api[query.controller] || api[query.resource])[query.type](query.options);
}

/**
 * Fetch data from API helper for controllers.
 *
 * Calls out to get posts per page, builds the final posts query & builds any additional queries
 * Uses Promise.all to handle the queries and ensure concurrent execution.
 * Does a first round of formatting on the response, and returns
 */
async function fetchData(pathOptions: any, routerOptions: any, locals: any): Promise<any> {
    pathOptions = pathOptions || {};
    routerOptions = routerOptions || {};

    // Two-level copy instead of upstream's cloneDeep: the spec fields and
    // option values are all primitives, only `options` is mutated below/in
    // processQuery, and defaultPostQuery must stay pristine across requests.
    const postQuery: any = {...defaultPostQuery, options: {...defaultPostQuery.options}};
    const promises: Promise<any>[] = [];

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
    promises.push(processQuery(postQuery, pathOptions.slug, locals));

    const apiCalls = resolveRouteData(routerOptions.data);

    // CASE: fetch more data defined by the router e.g. tags, authors - see TaxonomyRouter
    _.each(apiCalls, function (apiCall: any, name: string) {
        // Merge into a fresh object: the resolved spec is read again below to
        // shape the response, so it must stay as the adapter resolved it.
        const dataQueryOptions = _.merge({}, apiCall, defaultDataQueryOptions[name]);
        promises.push(processQuery(dataQueryOptions, pathOptions.slug, locals));
    });

    const results = await Promise.all(promises);
    // PERF (worker-readiness): upstream cloneDeep'd the (1–3MB) posts payload
    // to take ownership before mutating it. The ContentApiPort contract is
    // that every call returns freshly-owned JSON (the HTTP binding parses a
    // new body per request), so the copy was pure waste.
    const response = results[0];

    if (routerOptions.data) {
        response.data = {};

        let resultIndex = 1;

        _.each(apiCalls, function (apiCall: any, name: string) {
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

export default fetchData;
