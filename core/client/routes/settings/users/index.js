var UsersIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {

    model: function () {
        return this.store.find('user');
    }
});

export default UsersIndexRoute;
