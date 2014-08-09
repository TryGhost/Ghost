import ApplicationAdapter from 'ghost/adapters/application';

// EmbeddedRelationAdapter will augment the query object in calls made to
// DS.Store#find, findQuery, and findAll with the correct "includes"
// (?include=relatedType) by introspecting on the provided subclass of the DS.Model.
//
// Example:
// If a model has an embedded hasMany relation, the related type will be included:
// roles: DS.hasMany('role', { embedded: 'always' }) => ?include=roles

var EmbeddedRelationAdapter = ApplicationAdapter.extend({
    find: function (store, type, id) {
        return this.findQuery(store, type, this.buildQuery(store, type, id));
    },

    findQuery: function (store, type, query) {
        return this._super(store, type, this.buildQuery(store, type, query));
    },

    findAll: function (store, type, sinceToken) {
        return this.findQuery(store, type, this.buildQuery(store, type, sinceToken));
    },

    buildQuery: function (store, type, options) {
        var model,
            toInclude = [],
            query = {},
            deDupe = {};

        // Get the class responsible for creating records of this type
        model = store.modelFor(type);

        // Iterate through the model's relationships and build a list
        // of those that need to be pulled in via "include" from the API
        model.eachRelationship(function (name, meta) {
            if (meta.kind === 'hasMany' &&
                Object.prototype.hasOwnProperty.call(meta.options, 'embedded') &&
                meta.options.embedded === 'always') {

                toInclude.push(name);
            }
        });

        if (toInclude.length) {
            // If this is a find by id, build a query object and attach the includes
            if (typeof options === 'string' || typeof options === 'number') {
                query.id = options;
                query.include = toInclude.join(',');
            }
            // If this is a find all (no existing query object) build one and attach
            // the includes.
            // If this is a find with an existing query object then merge the includes
            // into the existing object. Existing properties and includes are preserved. 
            else if (typeof options === 'object' || Ember.isNone(options)) {
                query = options || query;
                toInclude = toInclude.concat(query.include ? query.include.split(',') : []);

                toInclude.forEach(function (include) {
                    deDupe[include] = true;
                });

                query.include = Object.keys(deDupe).join(',');
            }
        }

        return query;
    }
});

export default EmbeddedRelationAdapter;
