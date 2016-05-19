/* global moment */
import Transform from 'ember-data/transform';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            return moment.utc(serialized);
        }
        return serialized;
    },

    serialize(deserialized) {
        if (deserialized) {
            return deserialized.toJSON();
        }
        return deserialized;
    }
});
