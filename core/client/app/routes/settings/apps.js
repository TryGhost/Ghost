import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Apps',

    classNames: ['settings-view-apps'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        // TODO: 'theme' and 'private' settings also need to be queried here
        // otherwise we attempt to save a partial set of settings which fails
        // because "null" is not a valid theme
        return this.store.queryRecord('setting', {type: 'blog,theme,private'});
    }
});
