import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersAccessController extends Controller {
    @service settings;

    @tracked showLeavePortalModal = false;
    @tracked showLeaveRouteModal = false;
    @tracked showPortalSettings = false;

    queryParams = ['showPortalSettings'];

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveRouteModal = true;
        }
    }

    @action openPortalSettings() {
        this.saveSettingsTask.perform();
        this.showPortalSettings = true;
    }

    @action
    closePortalSettings() {
        const changedAttributes = this.settings.changedAttributes();
        if (changedAttributes && Object.keys(changedAttributes).length > 0) {
            this.showLeavePortalModal = true;
        } else {
            this.showPortalSettings = false;
        }
    }

    @action
    async confirmClosePortalSettings() {
        this.settings.rollbackAttributes();
        this.showPortalSettings = false;
        this.showLeavePortalModal = false;
    }

    @action
    cancelClosePortalSettings() {
        this.showLeavePortalModal = false;
    }

    @action
    openStripeSettings() {
        // Open stripe settings here
    }

    @action
    async confirmLeave() {
        this.settings.rollbackAttributes();
        this.leaveSettingsTransition.retry();
    }

    @action
    cancelLeave() {
        this.showLeaveRouteModal = false;
        this.leaveSettingsTransition = null;
    }

    @task({drop: true})
    *saveSettingsTask() {
        return yield this.settings.save();
    }

    reset() {
        this.showLeaveRouteModal = false;
        this.showLeavePortalModal = false;
        this.showPortalSettings = false;
    }
}
