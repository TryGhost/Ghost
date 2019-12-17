import RESTSerializer from '@ember-data/serializer/rest';
import {camelize, decamelize, underscore} from '@ember/string';
import {pluralize} from 'ember-inflector';

export default RESTSerializer.extend({
    // hacky method for getting access to meta data for single-resource responses
    // https://github.com/emberjs/data/pull/4077#issuecomment-200780097
    // TODO: review once the record links and meta RFC lands
    // https://github.com/emberjs/rfcs/blob/master/text/0332-ember-data-record-links-and-meta.md
    extractMeta(store, typeClass) {
        let meta = this._super(...arguments);
        typeClass.___meta = meta;
        return meta;
    },

    serialize(/*snapshot, options*/) {
        let json = this._super(...arguments);

        // don't send attributes that are updated automatically on the server
        delete json.created_by;
        delete json.updated_by;

        return json;
    },

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
    },

    keyForRelationship(key, typeClass, method) {
        let transform = method === 'serialize' ? underscore : camelize;

        if (typeClass === 'belongsTo' && !key.match(/(Id|By)$/)) {
            let transformed = `${transform(key)}_id`;
            return transformed;
        }

        return transform(key);
    }
});
