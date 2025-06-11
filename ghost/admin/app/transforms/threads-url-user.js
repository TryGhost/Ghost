import Transform from '@ember-data/serializer/transform';

export default class ThreadsUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            // Threads URLs are already full URLs, just return as is
            return serialized;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            // For Threads, we store the full URL since it's a newer platform
            return deserialized;
        }
        return deserialized;
    }
} 