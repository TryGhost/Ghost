var SettingsController = Ember.Controller.extend({
    showApps: Ember.computed.bool('config.apps')
});

export default SettingsController;
