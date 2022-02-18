import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service config;

    @tracked showProductModal = false;

    get product() {
        return this.args.product;
    }

    get showArchiveOption() {
        return this.product.type === 'paid' && !!this.product.monthlyPrice;
    }

    get productCurrency() {
        if (this.isFreeProduct) {
            const firstPaidProduct = this.args.products.find((product) => {
                return product.type === 'paid';
            });
            return firstPaidProduct?.monthlyPrice?.currency || 'usd';
        } else {
            return this.product?.monthlyPrice?.currency;
        }
    }

    get isPaidProduct() {
        return this.product.type === 'paid';
    }

    get hasCurrencySymbol() {
        const currencySymbol = getSymbol(this.product?.monthlyPrice?.currency);
        return currencySymbol?.length !== 3;
    }

    get isFreeProduct() {
        return this.product.type === 'free';
    }

    @action
    async openEditProduct(product) {
        this.args.openEditProduct(product);
    }
}
