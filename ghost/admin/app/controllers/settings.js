import AboutModal from '../components/modals/settings/about';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';

export default class SettingsController extends Controller {
    @service modals;
    @service upgradeStatus;

    @action
    openAbout() {
        this.advancedModal = this.modals.open(AboutModal);
    }
}
