import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {task} from 'ember-concurrency';

@classic
export default class FirstpromoterController extends Controller {
    @service notifications;
    @service settings;

    leaveSettingsTransition = null;

    @action
    update(value) {
        this.settings.set('firstpromoter', value);
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @action
    toggleLeaveSettingsModal(transition) {
        let leaveTransition = this.leaveSettingsTransition;

        if (!transition && this.showLeaveSettingsModal) {
            this.set('leaveSettingsTransition', null);
            this.set('showLeaveSettingsModal', false);
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.set('leaveSettingsTransition', transition);

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.set('showLeaveSettingsModal', true);
        }
    }

    @action
    leaveSettings() {
        let transition = this.leaveSettingsTransition;
        let settings = this.settings;

        if (!transition) {
            this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
            return;
        }

        // roll back changes on settings model
        settings.rollbackAttributes();

        return transition.retry();
    }

    @(task(function* () {
        try {
            yield this.settings.validate();
            return yield this.settings.save();
        } catch (error) {
            this.notifications.showAPIError(error);
            throw error;
        }
    }).drop())
        saveTask;
}
