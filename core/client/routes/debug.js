import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import SettingsModel from 'ghost/models/settings';
import loadingIndicator from 'ghost/mixins/loading-indicator';

export default AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    classNames: ['settings'],

    model: function () {
        return SettingsModel.create();
    }
});
