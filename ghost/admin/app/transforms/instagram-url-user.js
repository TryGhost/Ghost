import Transform from '@ember-data/serializer/transform';

export default class InstagramUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/(\S+)/) || [];
            return `https://www.instagram.com/${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:instagram\.com)\/(?:#!\/)?@?(\w+\/?\S+)/mi) || [];
            return user;
        }
        return deserialized;
    }
} 