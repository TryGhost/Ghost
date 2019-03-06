import ApplicationSerializer from 'ghost-admin/serializers/application';

export default ApplicationSerializer.extend({
    attrs: {
        unsubscribedAtUTC: {key: 'unsubscribed_at'},
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    },

    serialize() {
        let json = this._super(...arguments);

        // the API can't handle `status` being `null`
        if (!json.status) {
            delete json.status;
        }

        return json;
    }
});
