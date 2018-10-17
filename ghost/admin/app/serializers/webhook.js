import ApplicationSerializer from './application';

export default ApplicationSerializer.extend({
    attrs: {
        lastTriggeredAtUTC: {key: 'last_triggered_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    }
});
