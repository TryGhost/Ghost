import Component from '@ember/component';

const PERIODS = [
    {label: 'Daily', period: 'daily'},
    {label: 'Weekly', period: 'members'},
    {label: 'Monthly', period: 'monthly'},
    {label: 'Every 3 months', period: '3-months'},
    {label: 'Every 6 months', period: '6-months'},
    {label: 'Yearly', period: 'yearly'},
    {label: 'Custom', period: 'custom'},
    {label: 'One time', period: 'one-time'},
    {label: 'Unbilled', period: 'unbilled'}
];

export default Component.extend({
    init() {
        this._super(...arguments);
        this.availablePeriods = PERIODS;
    }
});