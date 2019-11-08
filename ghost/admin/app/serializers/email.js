/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';

export default ApplicationSerializer.extend({
    attrs: {
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'},
        submittedAtUTC: {key: 'submitted_at'}
    }
});
