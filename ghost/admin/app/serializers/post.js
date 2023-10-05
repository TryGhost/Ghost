/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default class PostSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    // settings for the EmbeddedRecordsMixin.
    attrs = {
        authors: {embedded: 'always'},
        tags: {embedded: 'always'},
        publishedAtUTC: {key: 'published_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'},
        email: {embedded: 'always'},
        newsletter: {embedded: 'always'},
        postRevisions: {embedded: 'always'}
    };

    serialize(snapshot/*, options*/) {
        let json = super.serialize(...arguments);

        // Inserted locally as a convenience.
        delete json.author_id;
        // Read-only virtual properties
        delete json.uuid;
        delete json.url;
        delete json.send_email_when_published;
        delete json.email_recipient_filter;
        delete json.email;
        delete json.newsletter;
        // Deprecated property (replaced with data.authors)
        delete json.author;
        // Page-only properties
        if (snapshot.modelName !== 'page') {
            delete json.show_title_and_feature_image;
        }

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
