import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var paginationSettings = {
    page: 1,
    limit: 20,
    status: 'all'
};

var UsersIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, PaginationRouteMixin, {
    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    model: function () {
        return this.store.filter('user', paginationSettings, function () {
            return true;
        });
    }
});

export default UsersIndexRoute;
