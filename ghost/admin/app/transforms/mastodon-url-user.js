import Transform from '@ember-data/serializer/transform';

export default class MastodonUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            // Mastodon URLs are already full URLs, just return as is
            return serialized;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            // For Mastodon, we store the full URL since instances can be different
            return deserialized;
        }
        return deserialized;
    }
} 