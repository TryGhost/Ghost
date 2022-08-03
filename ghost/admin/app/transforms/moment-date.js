import Transform from '@ember-data/serializer/transform';
import moment from 'moment';

export default class MomentDate extends Transform {
    deserialize(serialized) {
        if (serialized) {
            return moment(serialized);
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            return moment(deserialized).toDate();
        }
        return deserialized;
    }
}
