/* eslint-disable camelcase */
import Transform from '@ember-data/serializer/transform';

const DEFAULT_VALUE = true;

export default Transform.extend({
    deserialize(serialized) {
        if (serialized) {
            let settingsObject;
            try {
                settingsObject = JSON.parse(serialized) || DEFAULT_VALUE;
            } catch (e) {
                settingsObject = DEFAULT_VALUE;
            }

            return settingsObject;
        }

        return DEFAULT_VALUE;
    },

    serialize(deserialized) {
        return deserialized ? JSON.stringify(deserialized) : JSON.stringify(DEFAULT_VALUE);
    }
});
