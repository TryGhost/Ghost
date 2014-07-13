var SettingsIndexView = Ember.View.extend({
    //Ensure that going to the index brings the menu into view on mobile.
    showMenu: function () {
        this.get('parentView').showSettingsMenu();
    }.on('didInsertElement')
});

export default SettingsIndexView;
