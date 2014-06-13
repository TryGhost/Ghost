var AuthenticatedRoute = Ember.Route.extend({
    beforeModel: function (transition) {
        var user = this.container.lookup('user:current');

        if (!user || !user.get('isSignedIn')) {
            this.redirectToSignin(transition);
        }
    },
    redirectToSignin: function (transition) {
        this.notifications.showError('Please sign in');
        if (transition) {
            this.controllerFor('application').set('loginTransition', transition);
        }
        this.transitionTo('signin');
    },
    actions: {
        error: function (error) {
            if (error.jqXHR && error.jqXHR.status === 401) {
                this.redirectToSignin();
            }
        }
    }
});

export default AuthenticatedRoute;