import Component from 'ember-component';
import computed from 'ember-computed';

export default Component.extend({

    availableThemes: null,

    themes: computed('availableThemes', function () {
        let themes = this.get('availableThemes').map((t) => {
            let theme = {};

            theme.name = t.name;
            theme.label = t.package ? `${t.package.name} - ${t.package.version}` : t.name;
            theme.package = t.package;
            theme.active = !!t.active;
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
