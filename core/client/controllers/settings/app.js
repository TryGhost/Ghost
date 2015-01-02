/*global alert */

var appStates,
    SettingsAppController;

appStates = {
    active: 'active',
    working: 'working',
    inactive: 'inactive'
};

SettingsAppController = Ember.Controller.extend({
    appState: appStates.active,
    buttonText: '',

    setAppState: function () {
        this.set('appState', this.get('active') ? appStates.active : appStates.inactive);
    }.on('init'),

    buttonTextSetter: function () {
        switch (this.get('appState')) {
            case appStates.active:
                this.set('buttonText', 'Deactivate');
                break;
            case appStates.inactive:
                this.set('buttonText', 'Activate');
                break;
            case appStates.working:
                this.set('buttonText', 'Working');
                break;
        }
    }.observes('appState').on('init'),

    activeClass: Ember.computed('appState', function () {
        return this.appState === appStates.active ? true : false;
    }),

    inactiveClass: Ember.computed('appState', function () {
        return this.appState === appStates.inactive ? true : false;
    }),

    actions: {
        toggleApp: function (app) {
            var self = this;

            this.set('appState', appStates.working);

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
