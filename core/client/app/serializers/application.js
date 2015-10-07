import Ember from 'ember';
import DS from 'ember-data';

export default DS.RESTSerializer.extend({

    isNewSerializerAPI: true,

    serializeIntoHash: function (hash, type, record, options) {
        // Our API expects an id on the posted object
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        var root = Ember.String.pluralize(type.modelName),
            data = this.serialize(record, options);

        // Don't ever pass uuid's
        delete data.uuid;

        hash[root] = [data];
    }
});
