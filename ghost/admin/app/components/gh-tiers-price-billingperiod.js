import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const PERIODS = [
    {label: 'Monthly', period: 'month'},
    {label: 'Yearly', period: 'year'}
];

export default class GhTiersPriceBillingPeriodComponent extends Component {
    @service feature;
    @service session;
    @service settings;

    constructor() {
        super(...arguments);
        this.availablePeriods = PERIODS;
    }

    get value() {
        const {value} = this.args;
        return value;
    }
    get disabled() {
        const {disabled} = this.args;
        return disabled || false;
    }

    @action
    updatePeriod(newPeriod) {
        if (this.args.updatePeriod) {
            this.args.updatePeriod(this.args.value, newPeriod);
        }
    }
}
