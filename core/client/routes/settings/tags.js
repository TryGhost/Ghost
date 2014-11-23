import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var TagsRoute = AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {

    actions: {
        willTransition: function () {
            this.send('closeSettingsMenu');
        }
    },

    beforeModel: function () {
        if (!this.get('config.tagsUI')) {
            return this.transitionTo('settings.general');
        }

        return this.currentUser()
            .then(this.transitionAuthor());
    },

    model: function () {
        return this.store.find('tag');
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination();
    },

    renderTemplate: function (controller, model) {
        this._super(controller, model);
        this.render('settings/tags/settings-menu', {
            into: 'application',
            outlet: 'settings-menu',
            view: 'settings/tags/settings-menu'
        });
    }
});

export default TagsRoute;
