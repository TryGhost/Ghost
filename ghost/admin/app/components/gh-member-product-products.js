import Component from '@ember/component';

const PRODUCTS = [
    {label: 'Basic', id: '1'},
    {label: 'Advanced', id: '2'}
];

export default Component.extend({
    init() {
        this._super(...arguments);
        this.availableProducts = PRODUCTS;
    }
});