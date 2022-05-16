import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {isInvalidError} from 'ember-ajax/errors';
import {task} from 'ember-concurrency';

@classic
export default class SlackController extends Controller {
    @service ghostPaths;
    @service ajax;
    @service notifications;
    @service settings;

    leaveSettingsTransition = null;

    init() {
        super.init(...arguments);
    }

    get testNotificationDisabled() {
        const slackUrl = this.settings.get('slackUrl');
        return !slackUrl;
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

        // roll back changes on model props
        settings.rollbackAttributes();

        return transition.retry();
    }

    @(task(function* () {
        try {
            yield this.settings.validate();
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    }).drop())
        saveTask;

    @(task(function* () {
        let notifications = this.notifications;
        let slackApi = this.get('ghostPaths.url').api('slack', 'test');

        try {
            yield this.saveTask.perform();
            yield this.ajax.post(slackApi);
            notifications.showNotification('Test notification sent', {type: 'info', key: 'slack-test.send.success', description: 'Check your Slack channel for the test message'});
            return true;
        } catch (error) {
            if (error) {
                notifications.showAPIError(error, {key: 'slack-test:send'});

                if (!isInvalidError(error)) {
                    throw error;
                }
            }
        }
    }).drop())
        sendTestNotification;
}
