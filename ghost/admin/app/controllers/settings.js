import AboutModal from '../components/modals/settings/about';
import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsController extends Controller {
    @service modals;
    @service upgradeStatus;

    @action
    openAbout() {
        this.advancedModal = this.modals.open(AboutModal);
    }
}
