var SettingsController = Ember.Controller.extend({
    showApps: Ember.computed.bool('config.apps'),
    showTags: Ember.computed.bool('config.tagsUI')
});

export default SettingsController;
