import {Collection, RestSerializer} from 'miragejs';
import {pluralize} from 'ember-inflector';
import {underscore} from '@ember/string';

export default RestSerializer.extend({
    keyForCollection(collection) {
        return underscore(pluralize(collection));
    },

    keyForAttribute(attr) {
        return underscore(attr);
    },

    keyForRelationship(relationship) {
        return underscore(relationship);
    },

    keyForEmbeddedRelationship(relationship) {
        return underscore(relationship);
    },

    keyForForeignKey(relationshipName) {
        return `${underscore(relationshipName)}_id`;
    },

    serialize(object, request) {
        if (this.isModel(object)) {
            object = new Collection(object.modelName, [object]);
        }

        let json = RestSerializer.prototype.serialize.call(this, object, request);

        if (this.isCollection(object) && object.meta) {
            json.meta = object.meta;
        }

        return json;
    },

    // POST and PUT request send data in pluralized attributes for all models,
    // so we extract it here - this allows #normalizedRequestAttrs to work
    // in route functions
    normalize(body, modelName) {
        // sometimes mirage doesn't include a modelName, so we extrapolate it from
        // the first element of Object.keys
        modelName = pluralize(modelName) || Object.keys(body)[0];
        let [attributes] = body[modelName] || [{}];
        return {data: {attributes}};
    }
});
