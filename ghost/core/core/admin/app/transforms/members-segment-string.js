import Transform from '@ember-data/serializer/transform';

// the members segment supports `'none'` and `'all'` as special-case options
// but that doesn't map well for options in our token select inputs so we
// expand/convert them here to make usage elsewhere easier

export default class MembersSegmentStringTransform extends Transform {
    deserialize(serialized) {
        if (serialized === 'all') {
            return 'status:free,status:-free';
        }
        if (serialized === 'none') {
            return null;
        }

        return serialized;
    }

    serialize(deserialized) {
        if (deserialized === 'status:free,status:-free') {
            return 'all';
        }
        if (!deserialized) {
            return 'none';
        }

        return deserialized;
    }
}
