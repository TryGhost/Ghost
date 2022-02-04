import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class SetupFinishingTouchesController extends Controller {
    @service modals;
    @service router;
    @service settings;
    @service themeManagement;

    @task
    *saveAndContinueTask() {
        yield this.settings.save();
        this.modals.open('modals/get-started');
        this.router.transitionTo('home');
    }
}
