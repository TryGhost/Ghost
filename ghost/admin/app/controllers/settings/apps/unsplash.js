import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: service(),
    settings: service(),

    model: alias('settings.unsplash'),
    dirtyAttributes: null,
    rollbackValue: null,

    leaveSettingsTransition: null,

    save: task(function* () {
        let unsplash = this.get('model');
        let settings = this.get('settings');

        try {
            settings.set('unsplash', unsplash);
            this.set('dirtyAttributes', false);
            this.set('rollbackValue', null);
            return yield settings.save();
        } catch (error) {
            if (error) {
                this.get('notifications').showAPIError(error);
                throw error;
            }
        }
    }).drop(),

    actions: {
        save() {
            this.get('save').perform();
        },

        update(value) {
            if (!this.get('dirtyAttributes')) {
                this.set('rollbackValue', this.get('model.isActive'));
            }
            this.set('model.isActive', value);
            this.set('dirtyAttributes', true);
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

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on model props
            this.set('model.isActive', this.get('rollbackValue'));
            this.set('dirtyAttributes', false);
            this.set('rollbackValue', null);

            return transition.retry();
        }
    }
});
