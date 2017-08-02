/* eslint-disable camelcase */
import Transform from 'ember-data/transform';
import UnsplashObject from 'ghost-admin/models/unsplash-integration';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let settingsObject;
            try {
                settingsObject = JSON.parse(serialized) || {};
            } catch (e) {
                settingsObject = {};
            }

            return UnsplashObject.create(settingsObject);
        }

        return null;
    },

    serialize(deserialized) {
        return deserialized ? JSON.stringify(deserialized) : {};
    }
});
