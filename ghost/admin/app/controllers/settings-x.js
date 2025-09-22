import AboutModal from '../components/modals/settings/about';
import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsController extends Controller {
    @service modals;
    @service upgradeStatus;

    queryParams = ['search'];
    @tracked search = '';

    @action
    openAbout() {
        this.advancedModal = this.modals.open(AboutModal);
    }
}
