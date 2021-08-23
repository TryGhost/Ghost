import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalMemberProduct extends ModalComponent {
    @service store;
    @service ghostPaths;
    @service ajax;

    @tracked price;
    @tracked product;
    @tracked products = [];
    @tracked selectedProduct = null;
    @tracked loadingProducts = false;

    @task({drop: true})
    *fetchProducts() {
        this.products = yield this.store.query('product', {include: 'monthly_price,yearly_price,benefits'});
        this.loadingProducts = false;
        if (this.products.length > 0) {
            this.selectedProduct = this.products.firstObject.id;
        }
    }

    get activeSubscriptions() {
        const subscriptions = this.member.get('subscriptions') || [];
        return subscriptions.filter((sub) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status);
        });
    }

    get member() {
        return this.model;
    }

    get cannotAddPrice() {
        return !this.price || this.price.amount !== 0;
    }

    @action
    setup() {
        this.loadingProducts = true;
        this.fetchProducts.perform();
    }

    @action
    setProduct(productId) {
        this.selectedProduct = productId;
    }

    @action
    setPrice(price) {
        this.price = price;
    }

    @action
    confirmAction() {
        return this.addProduct.perform();
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    @task({drop: true})
    *addProduct() {
        let url = this.ghostPaths.url.api(`members/${this.member.get('id')}`);
        // Cancel existing active subscriptions for member
        for (let i = 0; i < this.activeSubscriptions.length; i++) {
            const subscription = this.activeSubscriptions[i];
            const cancelUrl = this.ghostPaths.url.api(`members/${this.member.get('id')}/subscriptions/${subscription.id}`);
            yield this.ajax.put(cancelUrl, {
                data: {
                    status: 'canceled'
                }
            });
        }
        let response = yield this.ajax.put(url, {
            data: {
                members: [{
                    id: this.member.get('id'),
                    email: this.member.get('email'),
                    products: [{
                        id: this.selectedProduct
                    }]
                }]
            }
        });

        this.store.pushPayload('member', response);
        this.closeModal();
        return response;
    }

    actions = {
        confirm() {
            this.confirmAction(...arguments);
        },
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    }
}
