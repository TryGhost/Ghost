import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var ResetRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-reset'],
    setupController: function (controller, params) {
        controller.token = params.token;
    }
});

export default ResetRoute;
