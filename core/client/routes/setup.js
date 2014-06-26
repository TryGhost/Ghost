import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-setup']
});

export default SetupRoute;
