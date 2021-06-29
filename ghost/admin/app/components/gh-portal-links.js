import Component from '@ember/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    config: service(),
    store: service(),
    settings: service(),
    tagName: '',
    isLink: true,
    prices: null,
    copiedPrice: null,
    copiedSignupInterval: null,
    selectedProduct: null,
    products: null,

    toggleValue: computed('isLink', function () {
        return this.isLink ? 'Data attributes' : 'Links';
    }),

    sectionHeaderLabel: computed('isLink', function () {
        return this.isLink ? 'Link' : 'Data attribute';
    }),
    selectedProductIdPath: computed('selectedProduct', function () {
        const selectedProduct = this.get('selectedProduct');
        if (selectedProduct) {
            return `/${selectedProduct.name}`;
        }
        return '';
    }),

    productOptions: computed('products.[]', function () {
        if (this.get('products')) {
            return this.get('products').map((product) => {
                return {
                    label: product.name,
                    name: product.id
                };
            });
        }
        return [];
    }),

    init() {
        this._super(...arguments);
        this.siteUrl = this.config.get('blogUrl');
    },

    actions: {
        toggleShowLinks() {
            this.toggleProperty('isLink');
        },
        setSelectedProduct(product) {
            this.set('selectedProduct', product);
        }
    },
    fetchProducts: task(function* () {
        const products = yield this.store.query('product', {include: 'monthly_price,yearly_price'}) || [];
        this.set('products', products);
        if (products.length > 0) {
            this.set('selectedProduct', {
                name: products.firstObject.id,
                label: products.firstObject.name
            });
        }
    }),
    copyStaticLink: task(function* (id) {
        this.set('copiedPrice', id);
        let data = '';
        if (this.isLink) {
            data = id ? `#/portal/${id}` : `#/portal/`;
        } else {
            data = id ? `data-portal="${id}"` : `data-portal`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    }),
    copyProductSignupLink: task(function* (interval) {
        this.set('copiedSignupInterval', interval);
        let data = '';
        if (this.isLink) {
            data = `#/portal/signup${this.selectedProductIdPath}/${interval}`;
        } else {
            data = `data-portal="signup${this.selectedProductIdPath}/${interval}"`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
});
