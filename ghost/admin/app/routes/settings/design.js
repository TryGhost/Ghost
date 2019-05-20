import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model() {
        return RSVP.hash({
            settings: this.settings.reload(),
            themes: this.store.findAll('theme')
        });
    },

    setupController(controller) {
        // reset the leave setting transition
        controller.set('leaveSettingsTransition', null);
        controller.set('themes', this.store.peekAll('theme'));
        this.controller.send('reset');
    },

    actions: {
        save() {
            // since shortcuts are run on the route, we have to signal to the components
            // on the page that we're about to save.
            $('.page-actions .gh-btn-blue').focus();

            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let modelIsDirty = controller.dirtyAttributes;

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        },

        activateTheme(theme) {
            return this.controller.send('activateTheme', theme);
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Design'
        };
    }
});
