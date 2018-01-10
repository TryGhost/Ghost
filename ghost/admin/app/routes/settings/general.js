import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    config: service(),
    settings: service(),

    titleToken: 'Settings - General',
    classNames: ['settings-view-general'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return RSVP.hash({
            settings: this.get('settings').reload(),
            availableTimezones: this.get('config.availableTimezones')
        });
    },

    setupController(controller, models) {
        // reset the leave setting transition
        controller.set('leaveSettingsTransition', null);
        controller.set('availableTimezones', models.availableTimezones);
    },

    actions: {
        save() {
            return this.get('controller').send('save');
        },

        reloadSettings() {
            return this.get('settings').reload();
        },

        willTransition(transition) {
            let controller = this.get('controller');
            let settings = this.get('settings');
            let settingsIsDirty = settings.get('hasDirtyAttributes');

            if (settingsIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }

    }
});
