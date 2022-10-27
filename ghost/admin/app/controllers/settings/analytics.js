import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class AnalyticsController extends Controller {
    @service settings;

    @task({drop: true})
    *saveSettings() {
        const response = yield this.settings.save();
        return response;
    }
}
