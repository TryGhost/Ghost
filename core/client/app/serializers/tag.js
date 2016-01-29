/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import ApplicationSerializer from 'ghost/serializers/application';

export default ApplicationSerializer.extend({
    serializeIntoHash(hash, type, record, options) {
        options = options || {};
        options.includeId = true;

        let root = Ember.String.pluralize(type.modelName);
        let data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.uuid;
        delete data.count;

        hash[root] = [data];
    }
});
