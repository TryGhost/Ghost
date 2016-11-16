import ApplicationSerializer from 'ghost-admin/serializers/application';

export default ApplicationSerializer.extend({
    attrs: {
        role: {key: 'role_id'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    }
});
