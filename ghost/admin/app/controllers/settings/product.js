import Controller from '@ember/controller';
import EmberObject, {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ProductController extends Controller {
    @service settings;
    @service config;

    @tracked showLeaveSettingsModal = false;
    @tracked showPriceModal = false;
    @tracked priceModel = null;
    @tracked showUnsavedChangesModal = false;
    @tracked paidSignupRedirect;

    constructor() {
        super(...arguments);
        this.siteUrl = this.config.get('blogUrl');
    }

    get product() {
        return this.model;
    }

    get stripePrices() {
        const stripePrices = this.model.stripePrices || [];
        return stripePrices.map((d) => {
            return {
                ...d,
                amount: d.amount / 100
            };
        });
    }

    get noOfPrices() {
        return (this.product.stripePrices || []).length;
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
        this.product.rollbackAttributes();
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
        const stripePrices = this.product.stripePrices.map((d) => {
            if (d.id === price.id) {
                return EmberObject.create(price);
            }
            return d;
        });
        if (!price.id) {
            stripePrices.push(EmberObject.create(price));
        }
        this.product.set('stripePrices', stripePrices);
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

    @task({drop: true})
    *saveTask() {
        this.send('validatePaidSignupRedirect');
        if (this.settings.get('errors').length !== 0) {
            return;
        }
        yield this.settings.save();
        return yield this.product.save();
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
