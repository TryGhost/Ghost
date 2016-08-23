import Component from 'ember-component';
import computed from 'ember-computed';

export default Component.extend({

    availableThemes: null,
    activeTheme: null,

    themes: computed('availableThemes', 'activeTheme', function () {
        return this.get('availableThemes').map((t) => {
            let theme = {};

            theme.name = t.name;
            theme.label = t.package ? `${t.package.name} - ${t.package.version}` : t.name;
            theme.package = t.package;
            theme.active = !!t.active;
            theme.isDefault = t.name === 'casper';
            theme.isDeletable = !theme.active && !theme.isDefault;

            return theme;
        }).sortBy('label');
    }).readOnly()

});
