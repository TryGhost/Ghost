import styleBody from 'ghost/mixins/style-body';
import SettingsModel from 'ghost/models/settings';

var settingsModel = SettingsModel.create();

var DebugRoute = Ember.Route.extend(styleBody, {
    classNames: ['settings'],
    model: function () {
        return settingsModel;
    }
});

export default DebugRoute;
