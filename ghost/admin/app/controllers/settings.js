import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';

@classic
export default class SettingsController extends Controller {
    @service settings;
    @service session;

    showLeaveSettingsModal = false;

    @action
    closeLeaveSettingsModal() {
        this.set('showLeaveSettingsModal', false);
    }

    @action
    async leavePortalSettings() {
        this.settings.rollbackAttributes();
        this.set('showLeaveSettingsModal', false);
    }
}
