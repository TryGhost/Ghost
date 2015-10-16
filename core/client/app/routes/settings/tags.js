import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

export default AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {
    titleToken: 'Settings - Tags',

    paginationModel: 'tag',
    paginationSettings: {
        include: 'post_count',
        limit: 15
    },

    beforeModel: function () {
        this._super(...arguments);

        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model: function () {
        this.store.unloadAll('tag');
        this.loadFirstPage();

        return this.store.filter('tag', function (tag) {
            return !tag.get('isNew');
        });
    },

    renderTemplate: function (controller, model) {
        this._super(controller, model);
        this.render('settings/tags/settings-menu', {
            into: 'application',
            outlet: 'settings-menu'
        });
    },

    deactivate: function () {
        this.send('resetPagination');
    }
});
