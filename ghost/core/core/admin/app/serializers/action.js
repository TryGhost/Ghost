/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';

export default class ActionSerializer extends ApplicationSerializer {
    attrs = {
        createdAtUTC: {key: 'created_at'}
    };
}
