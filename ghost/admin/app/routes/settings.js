import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);
        this.transitionEditor(this.session.user);
    }
});
