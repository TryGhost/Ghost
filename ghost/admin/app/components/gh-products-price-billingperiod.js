import Component from '@ember/component';

const PERIODS = [
    {label: 'Monthly', period: 'monthly'},
    {label: 'Yearly', period: 'yearly'}
];

export default Component.extend({
    init() {
        this._super(...arguments);
        this.availablePeriods = PERIODS;
    }
});