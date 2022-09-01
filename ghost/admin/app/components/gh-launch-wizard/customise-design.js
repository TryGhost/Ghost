import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class GhLaunchWizardCustomiseDesignComponent extends Component {
    @service notifications;
    @service settings;

    willDestroy() {
        super.willDestroy?.(...arguments);
        this.settings.rollbackAttributes();
        this.settings.errors.remove('accentColor');
    }

    @task
    *saveAndContinueTask() {
        try {
            if (this.settings.errors && this.settings.errors.length !== 0) {
                return;
            }
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
