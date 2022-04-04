import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class MembersEmailLabsController extends Controller {
    @service config;
    @service session;
    @service settings;

    // from/supportAddress are set here so that they can be reset to saved values on save
    // to avoid it looking like they've been saved when they have a separate update process
    @tracked fromAddress = '';
    @tracked supportAddress = '';

    @action
    setEmailAddress(property, email) {
        this[property] = email;
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
