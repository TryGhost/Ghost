import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    feature: service(),
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);

        if (this.feature.customThemeSettings) {
            this.transitionTo('settings.design');
        }
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
