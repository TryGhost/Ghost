import Transform from '@ember-data/serializer/transform';
import classic from 'ember-classic-decorator';

@classic
export default class Raw extends Transform {
    deserialize(serialized) {
        return serialized;
    }

    serialize(deserialized) {
        return deserialized;
    }
}
