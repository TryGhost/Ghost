import Transform from 'ember-data/transform';
import moment from 'moment';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            return moment(serialized);
        }
        return serialized;
    },

    serialize(deserialized) {
        if (deserialized) {
            return moment(deserialized).toDate();
        }
        return deserialized;
    }
});
