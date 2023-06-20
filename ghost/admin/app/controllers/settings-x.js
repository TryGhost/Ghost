import AboutModal from '../components/modals/settings/about';
import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsController extends Controller {
    @service modals;
    @service upgradeStatus;

    @tracked dirty = false;

    @action
    openAbout() {
        this.advancedModal = this.modals.open(AboutModal);
    }

    @action
    setDirty(dirty) {
        this.dirty = dirty;
    }
}
