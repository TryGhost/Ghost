import ApplicationSerializer from 'ghost-admin/serializers/application';
import {pluralize} from 'ember-inflector';

export default class Setting extends ApplicationSerializer {
    serializeIntoHash(hash, type, record, options) {
        // Settings API does not want ids
        options = options || {};
        options.includeId = false;

        let root = pluralize(type.modelName);
        let data = this.serialize(record, options);
        let payload = [];

        delete data.id;

        Object.keys(data).forEach((k) => {
            payload.push({key: k, value: data[k]});
        });

        hash[root] = payload;
    }

    normalizeArrayResponse(store, primaryModelClass, _payload, id, requestType) {
        let payload = {settings: [this._extractObjectFromArrayPayload(_payload)]};
        return super.normalizeArrayResponse(store, primaryModelClass, payload, id, requestType);
    }

    normalizeSingleResponse(store, primaryModelClass, _payload, id, requestType) {
        let payload = {setting: this._extractObjectFromArrayPayload(_payload)};
        return super.normalizeSingleResponse(store, primaryModelClass, payload, id, requestType);
    }

    _extractObjectFromArrayPayload(_payload) {
        let payload = {id: '0'};

        _payload.settings.forEach((setting) => {
            payload[setting.key] = setting.value;
        });

        return payload;
    }
}
