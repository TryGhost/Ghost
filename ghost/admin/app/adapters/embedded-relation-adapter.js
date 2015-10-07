import Ember from 'ember';
import BaseAdapter from 'ghost/adapters/base';

// EmbeddedRelationAdapter will augment the query object in calls made to
// DS.Store#findRecord, findAll, query, and queryRecord with the correct "includes"
// (?include=relatedType) by introspecting on the provided subclass of the DS.Model.
// In cases where there is no query object (DS.Model#save, or simple finds) the URL
// that is built will be augmented with ?include=... where appropriate.
//
// Example:
// If a model has an embedded hasMany relation, the related type will be included:
// roles: DS.hasMany('role', { embedded: 'always' }) => ?include=roles

export default BaseAdapter.extend({
    find: function (store, type, id, snapshot) {
        return this.ajax(this.buildIncludeURL(store, type.modelName, id, snapshot, 'find'), 'GET');
    },

    findRecord: function (store, type, id, snapshot) {
        return this.ajax(this.buildIncludeURL(store, type.modelName, id, snapshot, 'findRecord'), 'GET');
    },

    findAll: function (store, type, sinceToken) {
        var query, url;

        if (sinceToken) {
            query = {since: sinceToken};
        }

        url = this.buildIncludeURL(store, type.modelName, null, null, 'findAll');

        return this.ajax(url, 'GET', {data: query});
    },

    query: function (store, type, query) {
        return this._super(store, type, this.buildQuery(store, type.modelName, query));
    },

    queryRecord: function (store, type, query) {
        return this._super(store, type, this.buildQuery(store, type.modelName, query));
    },

    createRecord: function (store, type, snapshot) {
        return this.saveRecord(store, type, snapshot, {method: 'POST'});
    },

    updateRecord: function (store, type, snapshot) {
        var options = {
            method: 'PUT',
            id: Ember.get(snapshot, 'id')
        };

        return this.saveRecord(store, type, snapshot, options);
    },

    saveRecord: function (store, type, snapshot, options) {
        options = options || {};

        var url = this.buildIncludeURL(store, type.modelName, options.id, snapshot, 'createRecord'),
            payload = this.preparePayload(store, type, snapshot);

        return this.ajax(url, options.method, payload);
    },

    preparePayload: function (store, type, snapshot) {
        var serializer = store.serializerFor(type.modelName),
            payload = {};

        serializer.serializeIntoHash(payload, type, snapshot);

        return {data: payload};
    },

    buildIncludeURL: function (store, modelName, id, snapshot, requestType, query) {
        var url = this.buildURL(modelName, id, snapshot, requestType, query),
            includes = this.getEmbeddedRelations(store, modelName);

        if (includes.length) {
            url += '?include=' + includes.join(',');
        }

        return url;
    },

    buildQuery: function (store, modelName, options) {
        var toInclude = this.getEmbeddedRelations(store, modelName),
            query = options || {},
            deDupe = {};

        if (toInclude.length) {
            // If this is a find by id, build a query object and attach the includes
            if (typeof options === 'string' || typeof options === 'number') {
                query = {};
                query.id = options;
                query.include = toInclude.join(',');
            } else if (typeof options === 'object' || Ember.isNone(options)) {
                // If this is a find all (no existing query object) build one and attach
                // the includes.
                // If this is a find with an existing query object then merge the includes
                // into the existing object. Existing properties and includes are preserved.
                query = query || {};
                toInclude = toInclude.concat(query.include ? query.include.split(',') : []);

                toInclude.forEach(function (include) {
                    deDupe[include] = true;
                });

                query.include = Object.keys(deDupe).join(',');
            }
        }

        return query;
    },

    getEmbeddedRelations: function (store, modelName) {
        var model = store.modelFor(modelName),
            ret = [];

        // Iterate through the model's relationships and build a list
        // of those that need to be pulled in via "include" from the API
        model.eachRelationship(function (name, meta) {
            if (meta.kind === 'hasMany' &&
                Object.prototype.hasOwnProperty.call(meta.options, 'embedded') &&
                meta.options.embedded === 'always') {
                ret.push(name);
            }
        });

        return ret;
    }
});
