var AuthenticatedRoute = Ember.Route.extend({
    beforeModel: function () {
        if (!this.get('user.isSignedIn')) {
            this.notifications.showError('Please sign in');

            this.transitionTo('signin');
        }
    },

    actions: {
        error: function (error) {
            if (error.jqXHR.status === 401) {
                this.transitionTo('signin');
            }
        }
    }
});

export default AuthenticatedRoute;