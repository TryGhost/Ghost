import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Code Injection',
    classNames: ['settings-view-code'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return this.store.query('setting', {type: 'blog,theme,private'}).then((records) => {
            return records.get('firstObject');
        });
    },

    actions: {
        save() {
            this.get('controller').send('save');
        }
    }
});
