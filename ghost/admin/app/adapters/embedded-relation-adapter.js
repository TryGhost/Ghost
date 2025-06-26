import BaseAdapter from 'ghost-admin/adapters/base';
import {decamelize, underscore} from '@ember/string';
import {get} from '@ember/object';
import {isNone} from '@ember/utils';
import {pluralize} from 'ember-inflector';

// EmbeddedRelationAdapter will augment the query object in calls made to
// DS.Store#findRecord, findAll, query, and queryRecord with the correct "includes"
// (?include=relatedType) by introspecting on the provided subclass of the DS.Model.
// In cases where there is no query object (DS.Model#save, or simple finds) the URL
// that is built will be augmented with ?include=... where appropriate.
//
// Example:
// If a model has an embedded hasMany relation, the related type will be included:
// roles: DS.hasMany('role', { embedded: 'always' }) => ?include=roles

export default class EmbeddedRelationAdapter extends BaseAdapter {
    find(store, type, id, snapshot) {
        return this.ajax(this.buildIncludeURL(store, type.modelName, id, snapshot, 'find'), 'GET');
    }

    findRecord(store, type, id, snapshot) {
        return this.ajax(this.buildIncludeURL(store, type.modelName, id, snapshot, 'findRecord'), 'GET');
    }

    findAll(store, type, sinceToken) {
        let query, url;

        if (sinceToken) {
            query = {since: sinceToken};
        }

        url = this.buildIncludeURL(store, type.modelName, null, null, 'findAll');

        return this.ajax(url, 'GET', {data: query});
    }

    // Our API used to support ?limit=all but it was deprecated
    // and updated in 6.0 to always return at most 100 results.
    // However, our own code still makes use of it so when it's used
    // we handle it automatically by paginating through all results.
    async query(store, type, query) {
        if (query.limit !== 'all') {
            return super.query(store, type, this.buildQuery(store, type.modelName, query));
        }

        // Handle limit: 'all' by paginating through all results
        let allData = [];
        let page = 1;
        let lastMeta = null;
        const pageSize = 100;

        // Generate the data key using the same logic as the serializer
        const root = decamelize(type.modelName);
        const dataKey = pluralize(root);

        let hasMorePages = true;
        let firstRequestMade = false;
        while (hasMorePages) {
            // Create a fresh query object for each iteration,
            // overriding the limit and page parameters
            const paginatedQuery = {
                ...query,
                limit: pageSize,
                page: page
            };

            // Use super.query to get raw API responses
            const result = await super.query(store, type, this.buildQuery(store, type.modelName, paginatedQuery));

            // Handle the raw API response format
            const pageData = result[dataKey] || [];

            // Accumulate raw data from this page
            if (pageData.length > 0) {
                allData = allData.concat(pageData);
            }

            // Store metadata from this request (will use the last one)
            lastMeta = result.meta;

            // Guard: if this is the first request and there's no meta key,
            // assume the endpoint doesn't support pagination and return the data from this request
            if (!firstRequestMade) {
                firstRequestMade = true;
                if (!result.meta) {
                    hasMorePages = false;
                    break;
                }
            }

            // Check if we should continue paginating
            // Stop if this page returned fewer results than requested
            if (pageData.length < pageSize) {
                hasMorePages = false;
            }

            // Also stop if we have pagination info indicating we're done
            if (hasMorePages && lastMeta?.pagination) {
                const {page: currentPage, pages} = lastMeta.pagination;
                if (currentPage && pages && currentPage >= pages) {
                    hasMorePages = false;
                }
            }

            page = page + 1;
        }

        // Return the same raw response format as super.query()
        // Build our own metadata to show this as a single page with all results
        const combinedMeta = {
            pagination: {
                page: 1,
                limit: allData.length,
                pages: 1,
                total: allData.length,
                next: null,
                prev: null
            }
        };

        return {
            [dataKey]: allData,
            meta: combinedMeta
        };
    }

    queryRecord(store, type, query) {
        return super.queryRecord(store, type, this.buildQuery(store, type.modelName, query));
    }

    createRecord(store, type, snapshot) {
        return this.saveRecord(store, type, snapshot, {method: 'POST'}, 'createRecord');
    }

    updateRecord(store, type, snapshot) {
        let options = {
            method: 'PUT',
            id: get(snapshot, 'id')
        };

        return this.saveRecord(store, type, snapshot, options, 'updateRecord');
    }

    saveRecord(store, type, snapshot, options, requestType) {
        let _options = options || {};
        let url = this.buildIncludeURL(store, type.modelName, _options.id, snapshot, requestType);
        let payload = this.preparePayload(store, type, snapshot);

        return this.ajax(url, _options.method, payload);
    }

    preparePayload(store, type, snapshot) {
        let serializer = store.serializerFor(type.modelName);
        let payload = {};

        serializer.serializeIntoHash(payload, type, snapshot);

        return {data: payload};
    }

    buildIncludeURL(store, modelName, id, snapshot, requestType, query) {
        let includes = this.getEmbeddedRelations(store, modelName);
        let url = this.buildURL(modelName, id, snapshot, requestType, query);
        let parsedUrl = new URL(url);

        if (includes.length) {
            parsedUrl.searchParams.append('include', includes.map(underscore).join(','));
        }

        return parsedUrl.toString();
    }

    buildQuery(store, modelName, options) {
        let deDupe = {};
        let toInclude = this.getEmbeddedRelations(store, modelName);
        let query = options || {};

        if (toInclude.length) {
            // If this is a find by id, build a query object and attach the includes
            if (typeof options === 'string' || typeof options === 'number') {
                query = {};
                query.id = options;
                query.include = toInclude.map(underscore).join(',');
            } else if (typeof options === 'object' || isNone(options)) {
                // If this is a find all (no existing query object) build one and attach
                // the includes.
                // If this is a find with an existing query object then merge the includes
                // into the existing object. Existing properties and includes are preserved.
                query = query || {};
                toInclude = toInclude.concat(query.include ? query.include.split(',') : []);

                toInclude.forEach((include) => {
                    deDupe[include] = true;
                });

                query.include = Object.keys(deDupe).map(underscore).join(',');
            }
        }

        return query;
    }

    getEmbeddedRelations(store, modelName) {
        let model = store.modelFor(modelName);
        let ret = [];
        let embedded = [];

        // Iterate through the model's relationships and build a list
        // of those that need to be pulled in via "include" from the API
        model.eachRelationship((name, meta) => {
            if (
                meta.kind === 'hasMany'
                && Object.prototype.hasOwnProperty.call(meta.options, 'embedded')
                && meta.options.embedded === 'always'
            ) {
                ret.push(name);
                embedded.push([name, meta.type]);
            }
        });

        embedded.forEach(([relName, embeddedModelName]) => {
            this.getEmbeddedRelations(store, embeddedModelName).forEach((name) => {
                ret.push(`${relName}.${name}`);
            });
        });

        return ret;
    }
}
