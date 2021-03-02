import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class GhLaunchWizardCustomiseDesignComponent extends Component {
    @service notifications;
    @service settings;

    willDestroy() {
        this.settings.rollbackAttributes();
    }

    @task
    *saveAndContinueTask() {
        try {
            yield this.settings.save();
            this.args.nextStep();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    }
}
