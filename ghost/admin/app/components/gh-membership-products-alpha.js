import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service config;

    @tracked showProductModal = false;
    @tracked productModel = null;

    get products() {
        return this.args.products;
    }

    @action
    async openEditProduct(product) {
        this.productModel = product;
        this.showProductModal = true;
    }

    @action
    async openNewProduct() {
        this.productModel = this.store.createRecord('product');
        this.showProductModal = true;
    }

    @action
    closeProductModal() {
        this.showProductModal = false;
    }

    @action
    confirmProductSave() {
        this.args.confirmProductSave();
    }
}
