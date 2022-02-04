import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesController extends Controller {
    @service modals;
    @service router;
    @service settings;
    @service themeManagement;

    @action
    async saveAndContinue() {
        await this.settings.save();
        this.modals.open('modals/get-started');
        this.router.transitionTo('home');
    }
}
