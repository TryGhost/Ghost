import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var TagsRoute,
    paginationSettings;

paginationSettings = {
    page: 1,
    include: 'post_count',
    limit: 15
};

TagsRoute = AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {
    titleToken: 'Settings - Tags',

    beforeModel: function (transition) {
        this._super(transition);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model: function () {
        this.store.unloadAll('tag');

        return this.store.filter('tag', paginationSettings, function (tag) {
            return !tag.get('isNew');
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    renderTemplate: function (controller, model) {
        this._super(controller, model);
        this.render('settings/tags/settings-menu', {
            into: 'application',
            outlet: 'settings-menu'
        });
    },

    deactivate: function () {
        this.controller.send('resetPagination');
    }
});

export default TagsRoute;
