import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';

var SettingsRoute = AuthenticatedRoute.extend(styleBody, {
    classNames: ['settings']
});

export default SettingsRoute;