import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class SettingsMembershipOfferController extends Controller {
    @service settings;
    @service router;

    @task
    *saveTask() {
        try {
            if (this.settings.get('errors').length !== 0) {
                return;
            }
            yield this.settings.save();
            this.router.transitionTo('settings.membership');
            return true;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    }
}
