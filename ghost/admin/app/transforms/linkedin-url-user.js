import Transform from '@ember-data/serializer/transform';

export default class LinkedInUrlUser extends Transform {
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/(\S+)/) || [];
            return `https://www.linkedin.com/in/${user}`;
        }
        return serialized;
    }

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:linkedin\.com)\/in\/(?:#!\/)?(\w+\/?\S+)/mi) || [];
            return user;
        }
        return deserialized;
    }
} 