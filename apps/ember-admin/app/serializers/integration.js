import ApplicationSerializer from './application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default class IntegrationSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    attrs = {
        apiKeys: {embedded: 'always'},
        webhooks: {embedded: 'always'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    };
}
