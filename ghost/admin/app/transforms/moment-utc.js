import Transform from '@ember-data/serializer/transform';
import classic from 'ember-classic-decorator';
import moment from 'moment';

@classic
export default class MomentUtc extends Transform {
    deserialize(serialized) {
        if (serialized) {
            return moment.utc(serialized);
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            try {
                return deserialized.toJSON();
            } catch (e) {
                return deserialized;
            }
        }
        return deserialized;
    }
}
