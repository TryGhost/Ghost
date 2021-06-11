import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersEmailController extends Controller {
    @service config;
    @service session;
    @service settings;

    queryParams = ['emailRecipientsOpen', 'showEmailDesignSettings']

    // from/supportAddress are set here so that they can be reset to saved values on save
    // to avoid it looking like they've been saved when they have a separate update process
    @tracked fromAddress = '';
    @tracked supportAddress = '';

    @tracked showEmailDesignSettings = false;
    @tracked emailRecipientsOpen = false;
    @tracked showLeaveSettingsModal = false;

    @action
    setEmailAddress(property, email) {
        this[property] = email;
    }

    @action
    toggleEmailDesignSettings() {
        this.showEmailDesignSettings = !this.showEmailDesignSettings;
    }

    @action
    toggleEmailRecipientsOpen() {
        this.emailRecipientsOpen = !this.emailRecipientsOpen;
    }

    leaveRoute(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();
            this.leaveSettingsTransition = transition;
            this.showLeaveSettingsModal = true;
        }
        this.showEmailDesignSettings = false;
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

    parseEmailAddress(address) {
        const emailAddress = address || 'noreply';
        // Adds default domain as site domain
        if (emailAddress.indexOf('@') < 0 && this.config.emailDomain) {
            return `${emailAddress}@${this.config.emailDomain}`;
        }
        return emailAddress;
    }

    resetEmailAddresses() {
        this.fromAddress = this.parseEmailAddress(this.settings.get('membersFromAddress'));
        this.supportAddress = this.parseEmailAddress(this.settings.get('membersSupportAddress'));
    }

    @task({drop: true})
    *saveSettings() {
        const response = yield this.settings.save();
        this.resetEmailAddresses();
        return response;
    }
}
