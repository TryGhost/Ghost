/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import ApplicationSerializer from 'ghost-admin/serializers/application';

const {String: {pluralize}} = Ember;

export default ApplicationSerializer.extend({
    attrs: {
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    },

    serializeIntoHash(hash, type, record, options) {
        options = options || {};
        options.includeId = true;

        let root = pluralize(type.modelName);
        let data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.uuid;
        delete data.count;

        hash[root] = [data];
    }
});
