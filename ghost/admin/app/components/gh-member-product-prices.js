import Component from '@ember/component';

const PRICES = [
    {label: '$4/month', id: '1'},
    {label: '$40/year', id: '2'}
];

export default Component.extend({
    init() {
        this._super(...arguments);
        this.availablePrices = PRICES;
    }
});