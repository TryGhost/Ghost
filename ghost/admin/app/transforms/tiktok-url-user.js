import Transform from '@ember-data/serializer/transform';

export default class TikTokUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/(\S+)/) || [];
            return `https://www.tiktok.com/@${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:tiktok\.com)\/@?(\w+\/?\S+)/mi) || [];
            return user;
        }
        return deserialized;
    }
} 