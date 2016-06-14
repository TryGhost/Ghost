import Controller from 'ember-controller';
import {empty} from 'ember-computed';
import injectService from 'ember-service/inject';
import {invoke} from 'ember-invoke-action';

export default Controller.extend({
    ghostPaths: injectService(),
    ajax: injectService(),
    notifications: injectService(),

    // will be set by route
    settings: null,

    isSaving: false,
    savePromise: null,
    isSendingTest: false,

    testNotificationDisabled: empty('model.url'),

    actions: {
        sendTestNotification() {
            let notifications = this.get('notifications');
            let slackApi = this.get('ghostPaths.url').api('slack', 'test');

            if (this.get('isSendingTest')) {
                return;
            }

            this.set('isSendingTest', true);

            invoke(this, 'save').then(() => {
                this.get('ajax').post(slackApi).then(() => {
                    notifications.showAlert('Check your slack channel test message.', {type: 'info', key: 'slack-test.send.success'});
                }).catch((error) => {
                    notifications.showAPIError(error, {key: 'slack-test:send'});
                    throw error;
                });
            }).catch(() => {
                // noop - error already handled in .save
            }).finally(() => {
                this.set('isSendingTest', false);
            });
        },

        updateURL(value) {
            this.set('model.url', value);
            this.get('model.errors').clear();
        },

        save() {
            let slack = this.get('model');
            let settings = this.get('settings');

            if (this.get('isSaving')) {
                return;
            }

            return slack.validate().then(() => {
                settings.get('slack').clear().pushObject(slack);

                this.set('isSaving', true);

                return settings.save().catch((err) => {
                    this.get('notifications').showAPIError(err);
                    throw err;
                }).finally(() => {
                    this.set('isSaving', false);
                });
            });
        }
    }
});
