import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);
    },

    model() {
        return RSVP.hash({
            settings: this.settings.reload(),
            themes: this.store.findAll('theme')
        });
    },

    setupController(controller) {
        controller.set('themes', this.store.peekAll('theme'));
        this.controller.send('reset');
    },

    deactivate() {
        this._super(...arguments);
        this.controller.set('leaveSettingsTransition', null);
        this.controller.set('showLeaveSettingsModal', false);
    },

    actions: {
        activateTheme(theme) {
            return this.controller.send('activateTheme', theme);
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Theme'
        };
    }
});
