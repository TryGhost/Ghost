import SettingsModel from 'ghost/models/settings';

var settingsModel = SettingsModel.create();

var DebugRoute = Ember.Route.extend({
    model: function () {
        return settingsModel;
    }
});

export default DebugRoute;
