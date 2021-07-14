import Transform from '@ember-data/serializer/transform';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/@?([^/]*)/) || [];

            return `https://twitter.com/${user}`;
        }
        return serialized;
    },

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^/]*)/) || [];

            return `@${user}`;
        }
        return deserialized;
    }
});
