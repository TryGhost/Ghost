import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';

export default AuthenticatedRoute.extend(CurrentUserSettings, ShortcutsRoute, {
    queryParams: {
        type: {
            refreshModel: true,
            replace: true
        }
    },

    shortcuts: null,

    init() {
        this._super(...arguments);
        this.shortcuts = {
            c: 'newTag'
        };
    },

    // authors aren't allowed to manage tags
    beforeModel() {
        this._super(...arguments);

        this.transitionAuthor(this.session.user);
    },

    // set model to a live array so all tags are shown and created/deleted tags
    // are automatically added/removed. Also load all tags in the background,
    // pausing to show the loading spinner if no tags have been loaded yet
    model() {
        let promise = this.store.query('tag', {limit: 'all', include: 'count.posts'});
        let tags = this.store.peekAll('tag');
        if (this.store.peekAll('tag').get('length') === 0) {
            return promise.then(() => tags);
        } else {
            return tags;
        }
    },

    actions: {
        newTag() {
            this.transitionTo('tag.new');
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Tags'
        };
    }
});
