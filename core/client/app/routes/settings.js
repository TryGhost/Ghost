import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    titleToken: 'Settings',

    classNames: ['settings']
});

export default SettingsRoute;
