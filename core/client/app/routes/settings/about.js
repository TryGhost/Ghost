import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import styleBody from 'ghost/mixins/style-body';

var SettingsAboutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    beforeModel: function () {
        this.transitionTo('about');
    }
});

export default SettingsAboutRoute;
