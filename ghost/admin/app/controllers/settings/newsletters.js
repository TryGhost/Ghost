import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NewslettersController extends Controller {
    @service settings;

    queryParams = ['verifyEmail'];

    @tracked verifyEmail = null;

    @task({drop: true})
    *saveSettings() {
        const response = yield this.settings.save();
        return response;
    }
}
