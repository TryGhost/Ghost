var AuthenticatedRoute = Ember.Route.extend({
    actions: {
        error: function (error) {
            if (error.jqXHR.status === 401) {
                this.transitionTo('login');
            }
        }
    }
});

export default AuthenticatedRoute;