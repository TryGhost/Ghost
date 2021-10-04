import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersController extends Controller {
    @service config;
    @service settings;
    @service store;
    @tracked cadences = [];
    @tracked products = [];
    @tracked selectedDiscountType = 'percentage';

    constructor() {
        super(...arguments);
        this.setup();
    }

    @task({drop: true})
    *fetchProducts() {
        this.products = yield this.store.query('product', {include: 'monthly_price,yearly_price,benefits'});
        const cadences = [];
        this.products.forEach((product) => {
            cadences.push({
                label: `${product.name} - Monthly`,
                name: product.monthlyPrice.id
            });
            cadences.push({
                label: `${product.name} - Yearly`,
                name: product.yearlyPrice.id
            });
        });
        this.cadences = cadences;
    }

    @action
    setup() {
        this.fetchProducts.perform();
    }

    @action
    setDiscountType(discountType) {
        this.selectedDiscountType = discountType;
    }

    @action
    updateVisibility(tab) {
        this.tab = tab;
    }
}