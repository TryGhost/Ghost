import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class CodeInjectionController extends Controller {
    @service notifications;
    @service settings;

    @action
    save() {
        this.saveTask.perform();
    }

    @task
    *saveTask() {
        let notifications = this.notifications;

        try {
            return yield this.settings.save();
        } catch (error) {
            notifications.showAPIError(error, {key: 'code-injection.save'});
            throw error;
        }
    }
}
