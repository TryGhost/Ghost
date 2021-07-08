import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    config: service(),
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        this.transitionAuthor(this.session.user);
        this.transitionEditor(this.session.user);
    },

    model() {
        return RSVP.hash({
            settings: this.settings.reload(),
            availableTimezones: this.get('config.availableTimezones')
        });
    },

    setupController(controller, models) {
        // reset the leave setting transition
        controller.set('showLeaveSettingsModal', false);
        controller.set('leaveSettingsTransition', null);
        controller.set('availableTimezones', models.availableTimezones);
    },

    actions: {
        save() {
            return this.controller.send('save');
        },

        reloadSettings() {
            return this.settings.reload();
        },

        willTransition(transition) {
            let controller = this.controller;
            let settings = this.settings;
            let settingsIsDirty = settings.get('hasDirtyAttributes');

            if (settingsIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }

    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - General'
        };
    }
});
