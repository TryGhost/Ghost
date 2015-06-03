import Ember from 'ember';
import ApplicationSerializer from 'ghost/serializers/application';

var SettingSerializer = ApplicationSerializer.extend({
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

    extractArray: function (store, type, _payload) {
        var payload = {id: '0'};

        _payload.settings.forEach(function (setting) {
            payload[setting.key] = setting.value;
        });

        payload = this.normalize(type, payload);

        return [payload];
    },

    extractSingle: function (store, type, payload) {
        return this.extractArray(store, type, payload).pop();
    }
});

export default SettingSerializer;
