/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {empty} from '@ember/object/computed';
import {isInvalidError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    ghostPaths: service(),
    ajax: service(),
    notifications: service(),
    settings: service(),

    leaveSettingsTransition: null,
    slackArray: null,

    init() {
        this._super(...arguments);
        this.slackArray = [];
    },

    slackSettings: boundOneWay('settings.slack.firstObject'),
    testNotificationDisabled: empty('slackSettings.url'),

    actions: {
        save() {
            this.save.perform();
        },

        updateURL(value) {
            value = typeof value === 'string' ? value.trim() : value;
            this.set('slackSettings.url', value);
            this.get('slackSettings.errors').clear();
        },

        updateUsername(value) {
            value = typeof value === 'string' ? value.trimLeft() : value;
            this.set('slackSettings.username', value);
            this.get('slackSettings.errors').clear();
        },

        triggerDirtyState() {
            let slack = this.slackSettings;
            let slackArray = this.slackArray;
            let settings = this.settings;

            // Hack to trigger the `isDirty` state on the settings model by setting a new Array
            // for slack rather that replacing the existing one which would still point to the
            // same reference and therfore not setting the model into a dirty state
            slackArray.clear().pushObject(slack);
            settings.set('slack', slackArray);
        },

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
                if (this.save.isRunning) {
                    return this.save.last.then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveSettingsModal', true);
            }
        },

        leaveSettings() {
            let transition = this.leaveSettingsTransition;
            let settings = this.settings;
            let slackArray = this.slackArray;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on model props
            settings.rollbackAttributes();
            slackArray.clear();

            return transition.retry();
        }
    },

    save: task(function* () {
        let slack = this.slackSettings;
        let settings = this.settings;
        let slackArray = this.slackArray;

        try {
            yield slack.validate();
            // clear existing objects in slackArray to make sure we only push the validated one
            slackArray.clear().pushObject(slack);
            yield settings.set('slack', slackArray);
            return yield settings.save();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    }).drop(),

    sendTestNotification: task(function* () {
        let notifications = this.notifications;
        let slackApi = this.get('ghostPaths.url').api('slack', 'test');

        try {
            yield this.save.perform();
            yield this.ajax.post(slackApi);
            notifications.showNotification('Test notification sent', {type: 'info', key: 'slack-test.send.success', description: 'Check your Slack channel for the test message'});
            return true;
        } catch (error) {
            notifications.showAPIError(error, {key: 'slack-test:send'});

            if (!isInvalidError(error)) {
                throw error;
            }
        }
    }).drop()
});
