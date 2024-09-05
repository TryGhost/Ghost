import Controller from '@ember/controller';
import {AUDIENCE_TYPES} from 'ghost-admin/components/stats/parts/audience-filter';
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
    audienceOptions = AUDIENCE_TYPES;

    /**
     * @type {number|'all'}
     * Amount of days to load for member count and MRR related charts
     */
    @tracked chartDays = 30 + 1;
    /**
     * @type {array}
     * Filter by audience
     */
    @tracked audience = [];
    @tracked excludedAudiences = '';

    @action
    onDaysChange(selected) {
        this.chartDays = selected.value;
    }

    @action
    onAudienceChange(newExcludedAudiences) {
        if (newExcludedAudiences !== null) {
            this.excludedAudiences = newExcludedAudiences;
            this.audience = this.audienceOptions
                .filter(a => !this.excludedAudiences.includes(a.value))
                .map(a => a.value);
            // this.audience = this.audienceOptions.filter(a => !this.excludedAudiences.includes(a.value));
        } else {
            this.excludedAudiences = '';
            this.audience = this.audienceOptions.map(a => a.value);
        }
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.chartDays);
    }
}
