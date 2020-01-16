import Transform from '@ember-data/serializer/transform';

export default Transform.extend({
    deserialize(serialized) {
        return serialized;
    },

    serialize(deserialized) {
        return deserialized;
    }
});
