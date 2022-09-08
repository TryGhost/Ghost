import BaseAdapter from 'ghost-admin/adapters/base';
import {get} from '@ember/object';
import {isNone} from '@ember/utils';
import {underscore} from '@ember/string';

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

    query(store, type, query) {
        return super.query(store, type, this.buildQuery(store, type.modelName, query));
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
