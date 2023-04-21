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
        postStatus: {key: 'post_status'},
        reason: {key: 'reason'},
        featureImage: {key: 'feature_image'},
        featureImageAlt: {key: 'feature_image_alt'},
        featureImageCaption: {key: 'feature_image_caption'},
        postIdLocal: {key: 'post_id'}
    };
}
