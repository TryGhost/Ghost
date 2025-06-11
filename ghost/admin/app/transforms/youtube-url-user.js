import Transform from '@ember-data/serializer/transform';

export default class YouTubeUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/(\S+)/) || [];
            return `https://www.youtube.com/@${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:youtube\.com)\/@?(\w+\/?\S+)/mi) || [];
            return user;
        }
        return deserialized;
    }
} 