import Transform from 'ember-data/transform';

export default Transform.extend({
    deserialize(serialised) {
        return JSON.parse(serialised);
    },
    serialize(deserialised) {
        return deserialised ? JSON.stringify(deserialised) : null;
    }
});