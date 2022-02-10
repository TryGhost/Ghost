/* eslint-disable camelcase */
import ApplicationSerializer from 'ghost-admin/serializers/application';
import {pluralize} from 'ember-inflector';

export default class TagSerializer extends ApplicationSerializer {
    attrs = {
        createdAtUTC: {key: 'created_at'},
        updatedAtUTC: {key: 'updated_at'}
    };

    serialize(/*snapshot, options*/) {
        let json = super.serialize(...arguments);

        // Properties that exist on the model but we don't want sent in the payload
        delete json.count;

        return json;
    }

    // if we use `queryRecord` ensure we grab the first record to avoid
    // DS.SERIALIZER.REST.QUERYRECORD-ARRAY-RESPONSE deprecations
    normalizeResponse(store, primaryModelClass, payload, id, requestType) {
        if (requestType === 'queryRecord') {
            let singular = primaryModelClass.modelName;
            let plural = pluralize(singular);

            if (payload[plural]) {
                payload[singular] = payload[plural][0];
                delete payload[plural];
            }
        }
        return super.normalizeResponse(...arguments);
    }
}
