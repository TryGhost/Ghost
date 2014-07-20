import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var activeUsersPaginationSettings = {
    include: 'roles',
    page: 1,
    limit: 20
};

var invitedUsersPaginationSettings = {
    include: 'roles',
    where: {'status': 'invited'}
};

var UsersIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, PaginationRouteMixin, {

    setupController: function (controller, model) {
        this._super(controller, model.active);
        this.setupPagination(activeUsersPaginationSettings);

    },

    model: function () {
        // using `.filter` allows the template to auto-update when new models are pulled in from the server.
        // we just need to 'return true' to allow all models by default.
        return Ember.RSVP.hash({
            inactive: this.store.filter('user', invitedUsersPaginationSettings, function () {
                return true;
            }),
            active: this.store.filter('user', activeUsersPaginationSettings, function () {
                return true;
            })
        });
    }
});

export default UsersIndexRoute;
