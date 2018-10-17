import ApplicationSerializer from './application';

export default ApplicationSerializer.extend({
    attrs: {
        lastSeenAtUTC: {key: 'last_seen_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    }
});
