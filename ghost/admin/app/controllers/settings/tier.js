import Controller from '@ember/controller';
import EmberObject, {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class TierController extends Controller {
    @service config;
    @service membersUtils;
    @service settings;

    @tracked showLeaveSettingsModal = false;
    @tracked showPriceModal = false;
    @tracked priceModel = null;
    @tracked showUnsavedChangesModal = false;
    @tracked paidSignupRedirect;

    constructor() {
        super(...arguments);
        this.siteUrl = this.config.get('blogUrl');
    }

    get tier() {
        return this.model;
    }

    get stripePrices() {
        const stripePrices = this.model.stripePrices || [];
        return stripePrices.map((d) => {
            return {
                ...d,
                amount: d.amount / 100
            };
        }).sort((a, b) => {
            return a.amount - b.amount;
        }).sort((a, b) => {
            return a.currency.localeCompare(b.currency, undefined, {ignorePunctuation: true});
        }).sort((a, b) => {
            return (a.active === b.active) ? 0 : (a.active ? -1 : 1);
        });
    }

    get noOfPrices() {
        return (this.tier.stripePrices || []).length;
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.leaveScreenTransition = null;
            this.showUnsavedChangesModal = false;
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.leaveScreenTransition = transition;

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.showUnsavedChangesModal = true;
        }
    }

    @action
    leaveScreen() {
        this.tier.rollbackAttributes();
        return this.leaveScreenTransition.retry();
    }

    @action
    async openEditPrice(price) {
        this.priceModel = price;
        this.showPriceModal = true;
    }

    @action
    async openNewPrice() {
        this.priceModel = null;
        this.showPriceModal = true;
    }

    @action
    async archivePrice(price) {
        price.active = false;
        price.amount = price.amount * 100;
        this.send('savePrice', price);
    }

    @action
    async activatePrice(price) {
        price.active = true;
        price.amount = price.amount * 100;
        this.send('savePrice', price);
    }

    @action
    openStripeConnect() {
        alert('Update to use stripe-connect modal (see memberships screen)');
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
    save() {
        return this.saveTask.perform();
    }

    @action
    savePrice(price) {
        const stripePrices = this.tier.stripePrices.map((d) => {
            if (d.id === price.id) {
                return EmberObject.create({
                    ...price,
                    active: !!price.active
                });
            }
            return {
                ...d,
                active: !!d.active
            };
        });
        if (!price.id) {
            stripePrices.push(EmberObject.create({
                ...price,
                active: !!price.active
            }));
        }
        this.tier.set('stripePrices', stripePrices);
        this.saveTask.perform();
    }

    @action
    closePriceModal() {
        this.showPriceModal = false;
    }

    @action
    setPaidSignupRedirect(url) {
        this.paidSignupRedirect = url;
    }

    @action
    validatePaidSignupRedirect() {
        return this._validateSignupRedirect(this.paidSignupRedirect, 'membersPaidSignupRedirect');
    }

    @task({restartable: true})
    *saveTask() {
        this.send('validatePaidSignupRedirect');
        this.tier.validate();
        if (this.tier.get('errors').length !== 0) {
            return;
        }
        if (this.settings.get('errors').length !== 0) {
            return;
        }
        yield this.settings.save();
        const response = yield this.tier.save();
        if (this.showPriceModal) {
            this.closePriceModal();
        }
        return response;
    }

    _validateSignupRedirect(url, type) {
        let errMessage = `Please enter a valid URL`;
        this.settings.get('errors').remove(type);
        this.settings.get('hasValidated').removeObject(type);

        if (url === null) {
            this.settings.get('errors').add(type, errMessage);
            this.settings.get('hasValidated').pushObject(type);
            return false;
        }

        if (url === undefined) {
            // Not initialised
            return;
        }

        if (url.href.startsWith(this.siteUrl)) {
            const path = url.href.replace(this.siteUrl, '');
            this.settings.set(type, path);
        } else {
            this.settings.set(type, url.href);
        }
    }
}
