import Transform from 'ember-data/transform';
import moment from 'moment';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            return moment.utc(serialized);
        }
        return serialized;
    },

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
});
