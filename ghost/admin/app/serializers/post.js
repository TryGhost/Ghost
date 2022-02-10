/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';
import {pluralize} from 'ember-inflector';

export default class PostSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    // settings for the EmbeddedRecordsMixin.
    attrs = {
        authors: {embedded: 'always'},
        tags: {embedded: 'always'},
        publishedAtUTC: {key: 'published_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'},
        email: {embedded: 'always'}
    };

    normalizeSingleResponse(store, primaryModelClass, payload) {
        let root = this.keyForAttribute(primaryModelClass.modelName);
        let pluralizedRoot = pluralize(primaryModelClass.modelName);

        if (payload[pluralizedRoot]) {
            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];
        }

        return super.normalizeSingleResponse(...arguments);
    }

    normalizeArrayResponse() {
        return super.normalizeArrayResponse(...arguments);
    }

    serialize(/*snapshot, options*/) {
        let json = super.serialize(...arguments);

        // Inserted locally as a convenience.
        delete json.author_id;
        // Read-only virtual properties
        delete json.uuid;
        delete json.url;
        delete json.send_email_when_published;
        delete json.email_recipient_filter;
        // Deprecated property (replaced with data.authors)
        delete json.author;

        if (json.visibility === null) {
            delete json.visibility;
            delete json.visibility_filter;
            delete json.tiers;
        }

        if (json.visibility === 'tiers') {
            delete json.visibility_filter;
        }

        if (json.visibility === 'tiers' && !json.tiers?.length) {
            delete json.visibility;
            delete json.tiers;
        }

        return json;
    }
}
