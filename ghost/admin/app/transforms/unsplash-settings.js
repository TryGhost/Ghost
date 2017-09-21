/* eslint-disable camelcase */
import Transform from 'ember-data/transform';
import UnsplashObject from 'ghost-admin/models/unsplash-integration';

const DEFAULT_SETTINGS = {
    isActive: true
};

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let settingsObject;
            try {
                settingsObject = JSON.parse(serialized) || DEFAULT_SETTINGS;
            } catch (e) {
                settingsObject = DEFAULT_SETTINGS;
            }

            return UnsplashObject.create(settingsObject);
        }

        return DEFAULT_SETTINGS;
    },

    serialize(deserialized) {
        return deserialized ? JSON.stringify(deserialized) : JSON.stringify(DEFAULT_SETTINGS);
    }
});
