import ajax from 'ghost/utils/ajax';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import SettingsModel from 'ghost/models/settings';

var SettingsGeneralRoute = AuthenticatedRoute.extend({
    model: function () {
        return ajax('/ghost/api/v0.1/settings/?type=blog,theme,app').then(function (resp) {
            return SettingsModel.create(resp);
        });
    }
});

export default SettingsGeneralRoute;