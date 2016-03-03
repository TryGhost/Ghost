import Transform from 'ember-data/transform';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let url = 'https://twitter.com/';
            let modelVal = serialized;
            let [ , user ] = modelVal.match(/@?([^\/]*)/);

            url = modelVal ? url + user : modelVal;

            return url;
        }
        return serialized;
    },

    serialize(deserialized) {
        if (deserialized) {
            let username = '@';
            let [ , user] = deserialized.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^\/]*)/);
            username = username + user;

            return username;
        }
        return deserialized;
    }
});
