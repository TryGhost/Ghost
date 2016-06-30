import {A as emberA, isEmberArray} from 'ember-array/utils';
import Transform from 'ember-data/transform';
import NavigationItem from 'ghost-admin/models/navigation-item';

export default Transform.extend({
    deserialize(serialized) {
        let navItems, settingsArray;

        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        navItems = settingsArray.map((itemDetails) => {
            return NavigationItem.create(itemDetails);
        });

        return emberA(navItems);
    },

    serialize(deserialized) {
        let settingsArray;

        if (isEmberArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let label = item.get('label').trim();
                let url = item.get('url').trim();

                return {label, url};
            }).compact();
        } else {
            settingsArray = [];
        }

        return JSON.stringify(settingsArray);
    }
});
