import Ember from 'ember';
import RESTSerializer from 'ember-data/serializers/rest';

const {
    decamelize
} = Ember.String;

export default RESTSerializer.extend({
    serializeIntoHash(hash, type, record, options) {
        // Our API expects an id on the posted object
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        let root = Ember.String.pluralize(type.modelName);
        let data = this.serialize(record, options);

        // Don't ever pass uuid's
        delete data.uuid;

        hash[root] = [data];
    },

    keyForAttribute(attr) {
        return decamelize(attr);
    }
});
