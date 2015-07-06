import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import styleBody from 'ghost/mixins/style-body';

var paginationSettings;

paginationSettings = {
    page: 1,
    limit: 20,
    status: 'active'
};

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationRouteMixin, {
    titleToken: 'Team',

    classNames: ['view-team'],

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    beforeModel: function (transition) {
        this._super(transition);
    },

    model: function () {
        var self = this;

        return self.store.find('user', {limit: 'all', status: 'invited'}).then(function () {
            return self.store.filter('user', paginationSettings, function () {
                return true;
            });
        });
    },

    actions: {
        reload: function () {
            this.refresh();
        }
    }
});
