import Component from '@ember/component';
import {computed} from '@ember/object';
import {get} from '@ember/object';

export default Component.extend({

    themes: null,

    sortedThemes: computed('themes.@each.active', function () {
        let themes = get(this, 'themes').map((t) => {
            let theme = {};
            let themePackage = get(t, 'package');

            theme.model = t;
            theme.name = get(t, 'name');
            theme.label = themePackage ? `${themePackage.name}` : theme.name;
            theme.version = themePackage ? `${themePackage.version}` : '1.0';
            theme.package = themePackage;
            theme.active = get(t, 'active');
            theme.isDeletable = !theme.active;

            return theme;
        });
        let duplicateThemes = [];

        themes.forEach((theme) => {
            let duplicateLabels = themes.filterBy('label', theme.label);

            if (duplicateLabels.length > 1) {
                duplicateThemes.pushObject(theme);
            }
        });

        duplicateThemes.forEach((theme) => {
            if (theme.name !== 'casper') {
                theme.label = `${theme.label} (${theme.name})`;
            }
        });

        // "(default)" needs to be added to casper manually as it's always
        // displayed and would mess up the duplicate checking if added earlier
        let casper = themes.findBy('name', 'casper');
        if (casper) {
            casper.label = `${casper.label} (default)`;
            casper.isDefault = true;
            casper.isDeletable = false;
        }

        // sorting manually because .sortBy('label') has a different sorting
        // algorithm to [...strings].sort()
        return themes.sort((themeA, themeB) => {
            let a = themeA.label.toLowerCase();
            let b = themeB.label.toLowerCase();

            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
    }).readOnly()

});
