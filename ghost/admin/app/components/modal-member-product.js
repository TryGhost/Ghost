import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalMemberProduct extends ModalComponent {
    @service
    store

    @service
    ghostPaths

    @service
    ajax

    @tracked
    price

    @tracked
    product

    @tracked
    products = []

    constructor(...args) {
        super(...args);
        this.fetchProducts();
    }

    async fetchProducts() {
        this.products = await this.store.query('product', {include: 'stripe_prices'});
        this.product = this.products.firstObject;
    }

    get member() {
        return this.model;
    }

    get cannotAddPrice() {
        return !this.price || this.price.amount !== 0;
    }

    get prices() {
        if (!this.products || !this.products.length) {
            return [];
        }
        if (this.product) {
            return this.products.find((product) => {
                return product.id === this.product.id;
            }).stripePrices.map((price) => {
                return {
                    ...price,
                    label: `${price.nickname} (${getSymbol(price.currency)}${getNonDecimal(price.amount)}/${price.interval})`
                };
            });
        } else {
            return [];
        }
    }

    @action
    setProduct(product) {
        this.product = product;
    }

    @action
    setPrice(price) {
        this.price = price;
    }

    @task({
        drop: true
    })
    *addPriceTask() {
        let url = this.ghostPaths.url.api('members', this.member.get('id'), 'subscriptions');

        let response = yield this.ajax.post(url, {
            data: {
                stripe_price_id: this.price.stripe_price_id
            }
        });

        this.store.pushPayload('member', response);
        this.closeModal();
        return response;
    }
}
