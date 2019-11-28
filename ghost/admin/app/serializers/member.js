/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';

export default ApplicationSerializer.extend({
    attrs: {
        createdAtUTC: {key: 'created_at'}
    },

    serialize(/*snapshot, options*/) {
        let json = this._super(...arguments);

        // Properties that exist on the model but we don't want sent in the payload
        delete json.stripe;
        // Normalize properties
        json.name = json.name || '';
        json.note = json.note || '';
        return json;
    }
});
