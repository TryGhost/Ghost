import ApplicationSerializer from 'ghost-admin/serializers/application';
import {pluralize} from 'ember-inflector';

export default class Setting extends ApplicationSerializer {
    serializeIntoHash(hash, type, record, options) {
        // Settings API does not want ids
        options = options || {};
        options.includeId = false;

        let root = pluralize(type.modelName);
        let data = Object.keys(record.record.changedAttributes()).length > 0 ?
            this.serialize(record, options) : [];
        let payload = [];

        delete data.id;
        delete data._meta;

        Object.keys(data).forEach((k) => {
            payload.push({key: k, value: data[k]});
        });

        hash[root] = payload;
    }

    serializeAttribute(snapshot, json, key, attributes) {
        // Only serialize attributes that have changed and 
        // send a partial update to the API to avoid conflicts
        // with different screens using the same model
        // See https://github.com/TryGhost/Ghost/issues/15470
        if (
            !snapshot.record.get('isNew') &&
            !snapshot.record.changedAttributes()[key]
        ) {
            return;
        }
        super.serializeAttribute(snapshot, json, key, attributes);
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

        // HACK: Ember Data doesn't expose `meta` properties consistently
        //  - https://github.com/emberjs/data/issues/2905
        //
        // We need the `meta` data returned when saving so we extract it and dump
        // it onto the model as an attribute then delete it again when serializing.
        if (_payload.meta) {
            payload._meta = _payload.meta;
        }

        return payload;
    }
}
