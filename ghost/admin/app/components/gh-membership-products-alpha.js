import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const TYPES = [{
    name: 'Active',
    value: 'active'
},{
    name: 'Archived',
    value: 'archived'
}];

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;
    @service config;

    @tracked showProductModal = false;
    @tracked productModel = null;
    @tracked type = 'active';

    get products() {
        return this.args.products.filter((product) => {
            if (this.type === 'active') {
                return !!product.active;
            } else if (this.type === 'archived') {
                return !product.active;
            }
        });
    }

    get availableTypes() {
        return TYPES;
    }

    get selectedType() {
        return this.type ? TYPES.find((d) => {
            return this.type === d.value;
        }) : TYPES[0];
    }

    get isEmptyList() {
        return this.products.length === 0;
    }

    @action
    onTypeChange(type) {
        this.type = type.value;
    }

    @action
    async openEditProduct(product) {
        this.productModel = product;
        this.showProductModal = true;
    }

    @action
    async onUnarchive() {
        this.type = 'active';
        this.args.updatePortalPreview();
    }

    @action
    async onArchive() {
        this.args.updatePortalPreview();
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
