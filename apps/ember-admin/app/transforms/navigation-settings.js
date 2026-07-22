import NavigationItem from 'ghost-admin/models/navigation-item';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default class NavigationSettings extends Transform {
    deserialize(serialized, options) {
        let navItems, settingsArray;

        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        navItems = settingsArray.map((itemDetails) => {
            itemDetails.isSecondary = options && options.isSecondary || false;
            return NavigationItem.create(itemDetails);
        });

        return emberA(navItems);
    }

    serialize(deserialized) {
        let settingsArray;

        if (isEmberArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                let label = item.label.trim();
                let url = item.url.trim();

                return {label, url};
            }).compact();
        } else {
            settingsArray = [];
        }

        return JSON.stringify(settingsArray);
    }
}
