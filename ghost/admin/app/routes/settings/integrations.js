import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: service(),

    titleToken: 'Settings - Integrations',
    classNames: ['settings-view-integrations'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    }
});
