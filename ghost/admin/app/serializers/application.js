import Ember from 'ember';
import {decamelize} from 'ember-string';
import RESTSerializer from 'ember-data/serializers/rest';

const {String: {pluralize}} = Ember;

export default RESTSerializer.extend({
    serializeIntoHash(hash, type, record, options) {
        // Our API expects an id on the posted object
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        let root = pluralize(type.modelName);
        let data = this.serialize(record, options);

        // Don't ever pass uuid's
        delete data.uuid;

        hash[root] = [data];
    },

    keyForAttribute(attr) {
        return decamelize(attr);
    }
});
