/* eslint-disable camelcase */
import ApplicationSerializer from './application';
import {EmbeddedRecordsMixin} from '@ember-data/serializer/rest';

export default class MemberSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    attrs = {
        createdAtUTC: {key: 'created_at'},
        lastSeenAtUTC: {key: 'last_seen_at'},
        labels: {embedded: 'always'},
        newsletters: {embedded: 'always'}
    };

    serialize(/*snapshot, options*/) {
        let json = super.serialize(...arguments);

        // Properties that exist on the model but we don't want sent in the payload
        delete json.stripe;
        delete json.geolocation;
        delete json.status;
        delete json.last_seen_at;
        delete json.comped;

        // Normalize properties
        json.name = json.name || '';
        json.note = json.note || '';

        return json;
    }
}
