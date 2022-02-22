import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';
import {task, timeout} from 'ember-concurrency';

@classic
@tagName('')
export default class GhPortalLinks extends Component {
    @service config;
    @service store;
    @service settings;

    isLink = true;
    prices = null;
    copiedPrice = null;
    copiedSignupInterval = null;
    selectedProduct = null;
    products = null;

    @computed('isLink')
    get toggleValue() {
        return this.isLink ? 'Data attributes' : 'Links';
    }

    @computed('isLink')
    get sectionHeaderLabel() {
        return this.isLink ? 'Link' : 'Data attribute';
    }

    @computed('selectedProduct')
    get selectedProductIdPath() {
        const selectedProduct = this.selectedProduct;
        if (selectedProduct) {
            return `/${selectedProduct.name}`;
        }
        return '';
    }

    @computed('products.[]')
    get productOptions() {
        if (this.products) {
            return this.products.map((product) => {
                return {
                    label: product.name,
                    name: product.id
                };
            });
        }
        return [];
    }

    init() {
        super.init(...arguments);
        this.siteUrl = this.config.get('blogUrl');
    }

    @action
    toggleShowLinks() {
        this.toggleProperty('isLink');
    }

    @action
    setSelectedProduct(product) {
        this.set('selectedProduct', product);
    }

    @task(function* () {
        const products = yield this.store.query('product', {filter: 'type:paid', include: 'monthly_price,yearly_price'}) || [];
        this.set('products', products);
        if (products.length > 0) {
            this.set('selectedProduct', {
                name: products.firstObject.id,
                label: products.firstObject.name
            });
        }
    })
        fetchProducts;

    @task(function* (id) {
        this.set('copiedPrice', id);
        let data = '';
        if (this.isLink) {
            data = id ? `#/portal/${id}` : `#/portal/`;
            data = this.siteUrl + `/` + data;
        } else {
            data = id ? `data-portal="${id}"` : `data-portal`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyStaticLink;

    @task(function* (interval) {
        this.set('copiedSignupInterval', interval);
        let data = '';
        if (this.isLink) {
            data = `#/portal/signup${this.selectedProductIdPath}/${interval}`;
            data = this.siteUrl + `/` + data;
        } else {
            data = `data-portal="signup${this.selectedProductIdPath}/${interval}"`;
        }
        copyTextToClipboard(data);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyProductSignupLink;
}
