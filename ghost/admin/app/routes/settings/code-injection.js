import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);
        this.transitionEditor(this.session.user);
    },

    model() {
        return this.settings.reload();
    },

    deactivate() {
        this._super(...arguments);
        this.controller.set('leaveSettingsTransition', null);
        this.controller.set('showLeaveSettingsModal', false);
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let settings = this.settings;
            let modelIsDirty = settings.get('hasDirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Code injection'
        };
    }
});
