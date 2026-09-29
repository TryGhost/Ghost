import Transform from '@ember-data/serializer/transform';

export default class FacebookUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            const [, user] = serialized.match(/(\S+)/) || [];

            return `https://www.facebook.com/${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            const [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi) || [];

            return user;
        }
        return deserialized;
    }
}
