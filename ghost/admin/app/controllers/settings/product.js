import Controller from '@ember/controller';
import EmberObject, {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ProductController extends Controller {
    @service settings;

    @tracked showLeaveSettingsModal = false;
    @tracked showPriceModal = false;
    @tracked priceModel = null;
    @tracked showUnsavedChangesModal = false;

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

    @task({drop: true})
    *saveTask() {
        return yield this.product.save();
    }
}
