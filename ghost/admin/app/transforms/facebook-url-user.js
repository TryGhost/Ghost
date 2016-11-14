import Transform from 'ember-data/transform';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let [, user] = serialized.match(/(\S+)/);

            return `https://www.facebook.com/${user}`;
        }
        return serialized;
    },

    serialize(deserialized) {
        if (deserialized) {
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi);

            return user;
        }
        return deserialized;
    }
});
