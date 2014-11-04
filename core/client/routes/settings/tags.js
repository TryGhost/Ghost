import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';

var TagsRoute = AuthenticatedRoute.extend(CurrentUserSettings, {

    beforeModel: function () {
        if (!this.get('config.tagsUI')) {
            return this.transitionTo('settings.general');
        }

        return this.currentUser()
            .then(this.transitionAuthor());
    },

    model: function () {
        return this.store.find('tag');
    }
});

export default TagsRoute;
