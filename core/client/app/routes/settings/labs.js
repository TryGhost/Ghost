import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Labs',

    classNames: ['settings'],

    beforeModel(transition) {
        this._super(transition);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return this.store.query('setting', {type: 'blog,theme'}).then((records) => {
            return records.get('firstObject');
        });
    }
});
