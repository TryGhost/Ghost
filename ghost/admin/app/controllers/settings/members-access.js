import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersAccessController extends Controller {
    @service settings;

    @tracked showLeaveSettingsModal = false;
    @tracked subscriptionAccessOpen = false;
    @tracked postAccessOpen = false;

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveSettingsModal = true;
        }
    }

    @action
    async confirmLeave() {
        this.settings.rollbackAttributes();
        this.showLeaveSettingsModal = false;
        this.leaveSettingsTransition.retry();
    }

    @action
    cancelLeave() {
        this.showLeaveSettingsModal = false;
        this.leaveSettingsTransition = null;
    }

    @action
    toggleSubscriptionAccess() {
        this.subscriptionAccessOpen = !this.subscriptionAccessOpen;
    }

    @action
    togglePostAccess() {
        this.postAccessOpen = !this.postAccessOpen;
    }

    @action
    setDefaultContentVisibility(value) {
        this.settings.set('defaultContentVisibility', value);
    }

    @action
    setSubscriptionAccess(value) {
        switch (value) {
        case 'anyone':
            this.settings.set('membersAllowFreeSignup', true);
            break;

        case 'invite':
            this.settings.set('membersAllowFreeSignup', false);
            break;
        }
    }

    @task({drop: true})
    *saveSettingsTask() {
        return yield this.settings.save();
    }
}
