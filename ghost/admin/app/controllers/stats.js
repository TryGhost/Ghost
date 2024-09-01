import Controller from '@ember/controller';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// Options 30 and 90 need an extra day to be able to distribute ticks/gridlines evenly
const DAYS_OPTIONS = [{
    name: '7 Days',
    value: 7
}, {
    name: '30 Days',
    value: 30 + 1
}, {
    name: '90 Days',
    value: 90 + 1
}];

export default class StatsController extends Controller {
    daysOptions = DAYS_OPTIONS;

    /**
     * @type {number|'all'}
     * Amount of days to load for member count and MRR related charts
     */
    @tracked chartDays = 30 + 1;

    @action
    onDaysChange(selected) {
        this.chartDays = selected.value;
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.chartDays);
    }
}
