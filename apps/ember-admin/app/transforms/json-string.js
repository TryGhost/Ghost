import Transform from '@ember-data/serializer/transform';

export default class JsonString extends Transform {
    deserialize(serialized) {
        let _serialized = serialized === '' ? null : serialized;
        return JSON.parse(_serialized);
    }

    serialize(deserialized) {
        return deserialized ? JSON.stringify(deserialized) : null;
    }
}
