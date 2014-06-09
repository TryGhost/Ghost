import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import SettingsModel from 'ghost/models/settings';

export default AuthenticatedRoute.extend(styleBody, {
    classNames: ['settings'],

    model: function () {
        return SettingsModel.create();
    }
});
