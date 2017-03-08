import Controller from 'ember-controller';
import {empty} from 'ember-computed';
import injectService from 'ember-service/inject';
import {task} from 'ember-concurrency';
import {isInvalidError} from 'ember-ajax/errors';

export default Controller.extend({
    ghostPaths: injectService(),
    ajax: injectService(),
    notifications: injectService(),

    // will be set by route
    settings: null,

    testNotificationDisabled: empty('model.url'),

    save: task(function* () {
        let slack = this.get('model');
        let settings = this.get('settings');

        try {
            yield slack.validate();
            settings.get('slack').clear().pushObject(slack);
            return yield settings.save();

        } catch (error) {
            if (error) {
                this.get('notifications').showAPIError(error);
                throw error;
            }
        }
    }).drop(),

    sendTestNotification: task(function* () {
        let notifications = this.get('notifications');
        let slackApi = this.get('ghostPaths.url').api('slack', 'test');

        try {
            yield this.get('save').perform();
            yield this.get('ajax').post(slackApi);
            notifications.showAlert('Check your slack channel test message.', {type: 'info', key: 'slack-test.send.success'});
            return true;

        } catch (error) {
            notifications.showAPIError(error, {key: 'slack-test:send'});

            if (!isInvalidError(error)) {
                throw error;
            }
        }
    }).drop(),

    actions: {
        save() {
            return this.get('save').perform();
        },

        updateURL(value) {
            this.set('model.url', value);
            this.get('model.errors').clear();
        }
    }
});
