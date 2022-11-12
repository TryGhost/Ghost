import Controller from '@ember/controller';
import {action} from '@ember/object';
import {isInvalidError} from 'ember-ajax/errors';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class PleromaController extends Controller {
    @service ghostPaths;
    @service ajax;
    @service notifications;
    @service settings;

    get testNotificationDisabled() {
        return this.settings.pleromaUrl.length < 1;
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
        let pleromaApi = this.ghostPaths.url.api('pleroma', 'test');

        try {
					console.log('sendTestNotification')
            yield this.saveTask.perform();
            yield this.ajax.post(pleromaApi);
            notifications.showNotification('Test notification sent', {type: 'info', key: 'pleroma-test.send.success', description: 'Check your Pleroma channel for the test message'});
            return true;
        } catch (error) {
            if (error) {
                notifications.showAPIError(error, {key: 'pleroma-test:send'});

                if (!isInvalidError(error)) {
                    throw error;
                }
            }
        }
    }
}
