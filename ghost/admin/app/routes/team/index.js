import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import PaginationMixin from 'ghost-admin/mixins/pagination';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationMixin, {
    titleToken: 'Team',

    classNames: ['view-team'],

    paginationModel: 'user',
    paginationSettings: {
        status: 'active',
        limit: 20
    },

    model() {
        this.loadFirstPage();

        return this.store.query('user', {limit: 'all', status: 'invited'}).then(() => {
            return this.store.filter('user', () => {
                return true;
            });
        });
    },

    actions: {
        reload() {
            this.refresh();
        }
    }
});
