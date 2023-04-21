/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default class PostRevisionSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    // settings for the EmbeddedRecordsMixin.
    attrs = {
        author: {embedded: 'always'},
        lexical: {key: 'lexical'},
        title: {key: 'title'},
        createdAt: {key: 'created_at'},
        postIdLocal: {key: 'post_id'},
        postStatus: {key: 'post_status'},
        reason: {key: 'reason'},
        featureImage: {key: 'feature_image'}
    };
}
