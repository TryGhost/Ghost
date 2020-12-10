/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default ApplicationSerializer.extend(EmbeddedRecordsMixin, {
    attrs: {
        processedAtUTC: {key: 'processed_at'},
        deliveredAtUTC: {key: 'delivered_at'},
        openedAtUTC: {key: 'opened_at'},
        failedAtUTC: {key: 'failed_at'},
        email: {embedded: 'always'}
    }
});
