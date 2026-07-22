import Transform from '@ember-data/serializer/transform';

// post visibility supports `'members'` and `'paid'` as special-case options
// but that doesn't map well for options in our token select inputs so we
// expand/convert them here to make usage elsewhere easier

export default class VisibilityString extends Transform {
    deserialize(serialized) {
        if (serialized === 'members') {
            return 'status:free,status:-free';
        }
        if (serialized === 'paid') {
            return 'status:-free';
        }

        return serialized;
    }

    serialize(deserialized) {
        if (deserialized === 'status:free,status:-free') {
            return 'members';
        }
        if (deserialized === 'status:-free') {
            return 'paid';
        }

        return deserialized;
    }
}
