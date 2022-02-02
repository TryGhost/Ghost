import Transform from '@ember-data/serializer/transform';
import classic from 'ember-classic-decorator';
import moment from 'moment';

@classic
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
