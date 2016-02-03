import Ember from 'ember';
import ApplicationSerializer from 'ghost/serializers/application';

export default ApplicationSerializer.extend({
    serializeIntoHash(hash, type, record, options) {
        // Settings API does not want ids
        options = options || {};
        options.includeId = false;

        let root = Ember.String.pluralize(type.modelName);
        let data = this.serialize(record, options);
        let payload = [];

        delete data.id;

        Object.keys(data).forEach((k) => {
            payload.push({key: k, value: data[k]});
        });

        hash[root] = payload;
    },

    normalizeArrayResponse(store, primaryModelClass, _payload, id, requestType) {
        let payload = {settings: [this._extractObjectFromArrayPayload(_payload)]};
        return this._super(store, primaryModelClass, payload, id, requestType);
    },

    normalizeSingleResponse(store, primaryModelClass, _payload, id, requestType) {
        let payload = {setting: this._extractObjectFromArrayPayload(_payload)};
        return this._super(store, primaryModelClass, payload, id, requestType);
    },

    keyForAttribute(attr) {
        return attr;
    },

    _extractObjectFromArrayPayload(_payload) {
        let payload = {id: '0'};

        _payload.settings.forEach((setting) => {
            payload[setting.key] = setting.value;
        });

        return payload;
    }
});
