import {Collection, RestSerializer} from 'ember-cli-mirage';
import {pluralize} from 'ember-cli-mirage/utils/inflector';
import {underscore} from '@ember/string';

export default RestSerializer.extend({
    keyForAttribute(attr) {
        return underscore(attr);
    },

    serialize(object, request) {
        // Ember expects pluralized responses for the post, user, and invite models,
        // and this shortcut will ensure that those models are pluralized
        if (this.isModel(object) && ['post', 'user', 'invite'].includes(object.modelName)) {
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
