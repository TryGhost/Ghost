import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var SettingsRoute = AuthenticatedRoute.extend(styleBody, {
    titleToken: 'Settings',

    classNames: ['settings']
});

export default SettingsRoute;
