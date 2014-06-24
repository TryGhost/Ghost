import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-login']
});

export default SigninRoute;