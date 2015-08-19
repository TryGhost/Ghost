import DS from 'ember-data';
/* global moment */

export default DS.Transform.extend({
    deserialize: function (serialized) {
        if (serialized) {
            return moment(serialized);
        }
        return serialized;
    },
    serialize: function (deserialized) {
        if (deserialized) {
            return moment(deserialized).toDate();
        }
        return deserialized;
    }
});
