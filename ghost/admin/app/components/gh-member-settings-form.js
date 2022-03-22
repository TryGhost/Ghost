import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service feature;
    @service settings;

    constructor(...args) {
        super(...args);
        this.member = this.args.member;
        this.scratchMember = this.args.scratchMember;
    }

    @tracked showMemberProductModal = false;
    @tracked productsList;

    get canShowStripeInfo() {
        return !this.member.get('isNew') && this.membersUtils.isStripeEnabled;
    }

    get isAddComplimentaryAllowed() {
        if (!this.membersUtils.isStripeEnabled) {
            return false;
        }

        if (this.member.get('isNew')) {
            return false;
        }

        if (this.member.get('products')?.length > 0) {
            return false;
        }

        // complimentary subscriptions are assigned to products so it only
        // makes sense to show the "add complimentary" buttons when there's a
        // product to assign the complimentary subscription to
        const hasAnActivePaidProduct = !!this.productsList?.length;

        return hasAnActivePaidProduct;
    }

    get isCreatingComplimentary() {
        return this.args.isSaveRunning;
    }

    get products() {
        let subscriptions = this.member.get('subscriptions') || [];

        // Create the products from `subscriptions.price.product`
        let products = subscriptions
            .map(subscription => (subscription.tier || subscription.price.product))
            .filter((value, index, self) => {
                // Deduplicate by taking the first object by `id`
                return typeof value.id !== 'undefined' && self.findIndex(element => (element.product_id || element.id) === (value.product_id || value.id)) === index;
            });

        let subscriptionData = subscriptions.filter((sub) => {
            return !!sub.price;
        }).map((sub) => {
            return {
                ...sub,
                startDate: sub.start_date ? moment(sub.start_date).format('D MMM YYYY') : '-',
                validUntil: sub.current_period_end ? moment(sub.current_period_end).format('D MMM YYYY') : '-',
                cancellationReason: sub.cancellation_reason,
                price: {
                    ...sub.price,
                    currencySymbol: getSymbol(sub.price.currency),
                    nonDecimalAmount: getNonDecimal(sub.price.amount)
                },
                isComplimentary: !sub.id
            };
        });
        return products.map((product) => {
            let productSubscriptions = subscriptionData.filter((subscription) => {
                return subscription?.price?.product?.product_id === (product.product_id || product.id);
            });
            return {
                ...product,
                subscriptions: productSubscriptions
            };
        });
    }

    get customer() {
        let firstSubscription = this.member.get('subscriptions').firstObject;
        let customer = firstSubscription?.customer;

        if (customer) {
            return {
                ...customer,
                startDate: firstSubscription?.startDate
            };
        }
        return null;
    }

    get isStripeConnected() {
        return this.settings.get('stripeConnectAccountId');
    }

    @action
    setup() {
        this.fetchProducts.perform();
    }

    @action
    setProperty(property, value) {
        this.args.setProperty(property, value);
    }

    @action
    setLabels(labels) {
        this.member.set('labels', labels);
    }

    @action
    closeMemberProductModal() {
        this.showMemberProductModal = false;
    }

    @action
    cancelSubscription(subscriptionId) {
        this.cancelSubscriptionTask.perform(subscriptionId);
    }

    @action
    removeComplimentary(productId) {
        this.removeComplimentaryTask.perform(productId);
    }

    @action
    continueSubscription(subscriptionId) {
        this.continueSubscriptionTask.perform(subscriptionId);
    }

    @task({drop: true})
    *cancelSubscriptionTask(subscriptionId) {
        let url = this.ghostPaths.url.api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: true
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *removeComplimentaryTask(productId) {
        let url = this.ghostPaths.url.api(`members/${this.member.get('id')}`);
        let products = this.member.get('products') || [];

        const updatedProducts = products
            .filter(product => product.id !== productId)
            .map(product => ({id: product.id}));

        let response = yield this.ajax.put(url, {
            data: {
                members: [{
                    id: this.member.get('id'),
                    email: this.member.get('email'),
                    products: updatedProducts
                }]
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *continueSubscriptionTask(subscriptionId) {
        let url = this.ghostPaths.url.api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: false
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }

    @task({drop: true})
    *fetchProducts() {
        this.productsList = yield this.store.query('product', {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price'});
    }
}
