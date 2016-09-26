import ApplicationSerializer from 'ghost-admin/serializers/application';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';

export default ApplicationSerializer.extend(EmbeddedRecordsMixin, {
    attrs: {
        roles: {embedded: 'always'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    }
});
