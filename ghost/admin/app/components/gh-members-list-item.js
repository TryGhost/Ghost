import Component from '@glimmer/component';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhMembersListItem extends Component {
    @service store;

    constructor(...args) {
        super(...args);
    }

    get hasMultipleProducts() {
        return this.store.peekAll('product')?.length > 1;
    }

    get products() {
        const productData = get(this.args.member, 'products') || [];
        return productData.map(product => product.name).join(', ');
    }
}
