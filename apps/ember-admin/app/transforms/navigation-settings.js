import NavigationItem from 'ghost-admin/models/navigation-item';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default class NavigationSettings extends Transform {
    deserialize(serialized, options) {
        let settingsArray;

        try {
            settingsArray = JSON.parse(serialized) || [];
        } catch (e) {
            settingsArray = [];
        }

        const navItems = settingsArray.map((itemDetails) => {
            itemDetails.isSecondary = options && options.isSecondary || false;
            return NavigationItem.create(itemDetails);
        });

        return emberA(navItems);
    }

    serialize(deserialized) {
        let settingsArray;

        if (isEmberArray(deserialized)) {
            settingsArray = deserialized.map((item) => {
                const label = item.label.trim();
                const url = item.url.trim();
                const icon = item.icon && item.icon.trim();
                const visibility = item.visibility || 'public';

                return {
                    label,
                    url,
                    ...(icon ? {icon} : {}),
                    ...(visibility !== 'public' ? {visibility} : {})
                };
            }).compact();
        } else {
            settingsArray = [];
        }

        return JSON.stringify(settingsArray);
    }
}
