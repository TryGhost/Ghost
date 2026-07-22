import ApplicationSerializer from './application';

export default class ActionSerializer extends ApplicationSerializer {
    attrs = {
        lastTriggeredAtUTC: {key: 'last_triggered_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    };
}
