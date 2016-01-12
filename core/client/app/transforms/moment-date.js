/* global moment */
import Transform from 'ember-data/transform';

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
