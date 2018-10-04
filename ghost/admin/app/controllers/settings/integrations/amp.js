/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: service(),
    settings: service(),

    leaveSettingsTransition: null,

    ampSettings: alias('settings.amp'),

    actions: {
        update(value) {
            this.set('ampSettings', value);
        },

        save() {
            this.get('save').perform();
        },

        toggleLeaveSettingsModal(transition) {
            let leaveTransition = this.get('leaveSettingsTransition');

            if (!transition && this.get('showLeaveSettingsModal')) {
                this.set('leaveSettingsTransition', null);
                this.set('showLeaveSettingsModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveSettingsTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.get('save.isRunning')) {
                    return this.get('save.last').then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveSettingsModal', true);
            }
        },

        leaveSettings() {
            let transition = this.get('leaveSettingsTransition');
            let settings = this.get('settings');

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on settings model
            settings.rollbackAttributes();

            return transition.retry();
        }
    },

    save: task(function* () {
        let amp = this.get('ampSettings');
        let settings = this.get('settings');

        settings.set('amp', amp);

        try {
            return yield settings.save();
        } catch (error) {
            this.get('notifications').showAPIError(error);
            throw error;
        }
    }).drop()
});
