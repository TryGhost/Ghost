/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import ApplicationSerializer from 'ghost/serializers/application';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';

export default ApplicationSerializer.extend(EmbeddedRecordsMixin, {
    // settings for the EmbeddedRecordsMixin.
    attrs: {
        tags: {embedded: 'always'}
    },

    normalize(model, hash, prop) {
        // this is to enable us to still access the raw authorId
        // without requiring an extra get request (since it is an
        // async relationship).
        if ((prop === 'post' || prop === 'posts') && hash.author !== undefined) {
            hash.author_id = hash.author;
        }

        return this._super(...arguments);
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
