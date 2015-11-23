import DS from 'ember-data';

const {Transform} = DS;

export default Transform.extend({
    deserialize: function (serialized) {
        return serialized;
    },

    serialize: function (deserialized) {
        return deserialized;
    }
});
