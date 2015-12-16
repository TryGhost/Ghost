/* global moment */
import DS from 'ember-data';

const {Transform} = DS;

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
