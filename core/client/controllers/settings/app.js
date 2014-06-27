/*global alert */

var AppStates = {
    active: 'active',
    working: 'working',
    inactive: 'inactive'
};

var SettingsAppController = Ember.ObjectController.extend({
    appState: AppStates.active,
    buttonText: '',
    
    setAppState: function () {
        this.set('appState', this.get('active') ? AppStates.active : AppStates.inactive);
    }.on('init'),

    buttonTextSetter: function () {
        switch (this.get('appState')) {
            case AppStates.active:
                this.set('buttonText', 'Deactivate');
                break;
            case AppStates.inactive:
                this.set('buttonText', 'Activate');
                break;
            case AppStates.working:
                this.set('buttonText', 'Working');
                break;
        }
    }.observes('appState').on('init'),

    activeClass: function () {
        return this.appState === AppStates.active ? true : false;
    }.property('appState'),

    inactiveClass: function () {
        return this.appState === AppStates.inactive ? true : false;
    }.property('appState'),

    actions: {
        toggleApp: function (app) {
            var self = this;
            this.set('appState', AppStates.working);
            
            app.set('active', !app.get('active'));
            
            app.save().then(function () {
                self.setAppState();
            })
            .then(function () {
                alert('@TODO: Success');
            })
            .catch(function () {
                alert('@TODO: Failure');
            });
        }
    }
});

export default SettingsAppController;
