import Controller from '@ember/controller';
import {action} from '@ember/object';
import {isInvalidError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class SlackController extends Controller {
    @service ghostPaths;
    @service ajax;
    @service notifications;
    @service settings;

    get testNotificationDisabled() {
        const slackUrl = this.settings.slackUrl;
        return !slackUrl;
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @task({drop: true})
    *saveTask() {
        try {
            yield this.settings.validate();
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    }

    @task({drop: true})
    *sendTestNotification() {
        let notifications = this.notifications;
        let slackApi = this.ghostPaths.url.api('slack', 'test');

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
    }
}
