import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    classNames: ['settings']
});

export default SettingsRoute;