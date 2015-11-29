import Ember from 'ember';
import ApplicationSerializer from 'ghost/serializers/application';

export default ApplicationSerializer.extend({
    serializeIntoHash: function (hash, type, record, options) {
        // Settings API does not want ids
        options = options || {};
        options.includeId = false;

        var root = Ember.String.pluralize(type.modelName),
            data = this.serialize(record, options),
            payload = [];

        delete data.id;

        Object.keys(data).forEach(function (k) {
            payload.push({key: k, value: data[k]});
        });

        hash[root] = payload;
    },

    normalizeArrayResponse: function (store, primaryModelClass, _payload, id, requestType) {
        var payload = {settings: [this._extractObjectFromArrayPayload(_payload)]};
        return this._super(store, primaryModelClass, payload, id, requestType);
    },

    normalizeSingleResponse: function (store, primaryModelClass, _payload, id, requestType) {
        var payload = {setting: this._extractObjectFromArrayPayload(_payload)};
        return this._super(store, primaryModelClass, payload, id, requestType);
    },

    _extractObjectFromArrayPayload: function (_payload) {
        var payload = {id: '0'};

        _payload.settings.forEach(function (setting) {
            payload[setting.key] = setting.value;
        });

        return payload;
    }
});
