import ApplicationSerializer from 'ghost-admin/serializers/application';

export default class ApiKeySerializer extends ApplicationSerializer {
    attrs = {
        lastSeenAtUTC: {key: 'last_seen_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    };
}
