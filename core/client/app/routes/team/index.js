import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationRouteMixin, {
    titleToken: 'Team',

    classNames: ['view-team'],

    paginationModel: 'user',
    paginationSettings: {
        status: 'active',
        limit: 20
    },

    model: function () {
        var self = this;

        this.loadFirstPage();

        return self.store.query('user', {limit: 'all', status: 'invited'}).then(function () {
            return self.store.filter('user', function () {
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
