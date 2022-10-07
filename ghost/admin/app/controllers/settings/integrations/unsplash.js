import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class UnsplashController extends Controller {
    @service notifications;
    @service settings;

    @action
    update(value) {
        this.settings.unsplash = value;
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
            this.notifications.showAPIError(error);
            throw error;
        }
    }
}
