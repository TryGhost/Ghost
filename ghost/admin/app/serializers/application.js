import RESTSerializer from 'ember-data/serializers/rest';
import {decamelize} from '@ember/string';
import {pluralize} from 'ember-inflector';

export default RESTSerializer.extend({
    serializeIntoHash(hash, type, record, options) {
        // Our API expects an id on the posted object
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        let root = pluralize(type.modelName);
        let data = this.serialize(record, options);

        hash[root] = [data];
    },

    keyForAttribute(attr) {
        return decamelize(attr);
    }
});
