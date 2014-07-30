import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import ghostPaths from 'ghost/utils/ghost-paths';

var SignoutRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
    classNames: ['ghost-signout'],

    afterModel: function (model, transition) {
        if (Ember.canInvoke(transition, 'send')) {
            transition.send('invalidateSession');
            transition.abort();
            this.hardRefresh();
        } else {
            this.send('invalidateSession');
            this.hardRefresh();
        }
    },

    hardRefresh: function () {
        window.location = ghostPaths().adminRoot + '/signin/';
    }
});

export default SignoutRoute;
