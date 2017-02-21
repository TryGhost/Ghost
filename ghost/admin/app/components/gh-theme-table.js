import Component from 'ember-component';
import computed from 'ember-computed';
import get from 'ember-metal/get';

export default Component.extend({

    themes: null,
    activeTheme: null,

    sortedThemes: computed('themes.[]', 'activeTheme', function () {
        let activeTheme = get(this, 'activeTheme');
        let themes = get(this, 'themes').map((t) => {
            let theme = {};
            let themePackage = get(t, 'package');

            theme.name = get(t, 'name');
            theme.label = themePackage ? `${themePackage.name} - ${themePackage.version}` : theme.name;
            theme.package = themePackage;
            theme.active = theme.name === activeTheme;
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
