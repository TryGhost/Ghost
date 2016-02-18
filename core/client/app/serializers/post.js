/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import DS from 'ember-data';
import ApplicationSerializer from 'ghost/serializers/application';

const {EmbeddedRecordsMixin} = DS;

export default ApplicationSerializer.extend(EmbeddedRecordsMixin, {
    // settings for the EmbeddedRecordsMixin.
    attrs: {
        tags: {embedded: 'always'}
    },

    normalizeHash: {
        // this is to enable us to still access the raw authorId
        // without requiring an extra get request (since it is an
        // async relationship).
        posts(hash) {
            hash.author_id = hash.author;
            return hash;
        }
    },

    normalizeSingleResponse(store, primaryModelClass, payload) {
        let root = this.keyForAttribute(primaryModelClass.modelName);
        let pluralizedRoot = Ember.String.pluralize(primaryModelClass.modelName);

        payload[root] = payload[pluralizedRoot][0];
        delete payload[pluralizedRoot];

        return this._super(...arguments);
    },

    normalizeArrayResponse() {
        return this._super(...arguments);
    },

    serializeIntoHash(hash, type, record, options) {
        options = options || {};
        options.includeId = true;

        // We have a plural root in the API
        let root = Ember.String.pluralize(type.modelName);
        let data = this.serialize(record, options);

        // Properties that exist on the model but we don't want sent in the payload

        delete data.uuid;
        delete data.html;
        // Inserted locally as a convenience.
        delete data.author_id;
        // Read-only virtual property.
        delete data.url;

        hash[root] = [data];
    }
});
