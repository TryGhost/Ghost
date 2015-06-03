import Ember from 'ember';
import BaseAdapter from 'ghost/adapters/base';

// EmbeddedRelationAdapter will augment the query object in calls made to
// DS.Store#find, findQuery, and findAll with the correct "includes"
// (?include=relatedType) by introspecting on the provided subclass of the DS.Model.
// In cases where there is no query object (DS.Model#save, or simple finds) the URL
// that is built will be augmented with ?include=... where appropriate.
//
// Example:
// If a model has an embedded hasMany relation, the related type will be included:
// roles: DS.hasMany('role', { embedded: 'always' }) => ?include=roles

var EmbeddedRelationAdapter = BaseAdapter.extend({
    find: function (store, type, id) {
        return this.ajax(this.buildIncludeURL(store, type, id), 'GET');
    },

    findQuery: function (store, type, query) {
        return this._super(store, type, this.buildQuery(store, type, query));
    },

    findAll: function (store, type, sinceToken) {
        var query = {};

        if (sinceToken) {
            query.since = sinceToken;
        }

        return this.findQuery(store, type, query);
    },

    createRecord: function (store, type, record) {
        return this.saveRecord(store, type, record, {method: 'POST'});
    },

    updateRecord: function (store, type, record) {
        var options = {
            method: 'PUT',
            id: Ember.get(record, 'id')
        };

        return this.saveRecord(store, type, record, options);
    },

    saveRecord: function (store, type, record, options) {
        options = options || {};

        var url = this.buildIncludeURL(store, type, options.id),
            payload = this.preparePayload(store, type, record);

        return this.ajax(url, options.method, payload);
    },

    preparePayload: function (store, type, record) {
        var serializer = store.serializerFor(type.modelName),
            payload = {};

        serializer.serializeIntoHash(payload, type, record);

        return {data: payload};
    },

    buildIncludeURL: function (store, type, id) {
        var url = this.buildURL(type.modelName, id),
            includes = this.getEmbeddedRelations(store, type);

        if (includes.length) {
            url += '?include=' + includes.join(',');
        }

        return url;
    },

    buildQuery: function (store, type, options) {
        var toInclude = this.getEmbeddedRelations(store, type),
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

    getEmbeddedRelations: function (store, type) {
        var model = store.modelFor(type),
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

export default EmbeddedRelationAdapter;
