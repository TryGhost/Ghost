import Transform from '@ember-data/serializer/transform';

export default class TwitterUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            const [, user] = serialized.match(/@?([^/]*)/) || [];

            return `https://twitter.com/${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            const [, user] = deserialized.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^/]*)/) || [];

            return `@${user}`;
        }
        return deserialized;
    }
}
