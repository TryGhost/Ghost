import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

const PERIODS = [
    {label: 'Monthly', period: 'month'},
    {label: 'Yearly', period: 'year'}
];

export default class GhPostsListItemComponent extends Component {
    @service feature;
    @service session;
    @service settings;

    get value() {
        const {value} = this.args;
        return value;
    }
    get disabled() {
        const {disabled} = this.args;
        return disabled || false;
    }
    constructor() {
        super(...arguments);
        this.availablePeriods = PERIODS;
    }
}
