import Controller from '@ember/controller';
import {AUDIENCE_TYPES} from 'ghost-admin/components/stats/parts/audience-filter';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// Options 30 and 90 need an extra day to be able to distribute ticks/gridlines evenly
const RANGE_OPTIONS = [
    {
        name: 'Last 24 hours',
        value: 1
    },
    {
        name: 'Last 7 days',
        value: 7
    },
    {
        name: 'Last 30 days',
        value: 30 + 1
    },
    {
        name: 'Last 3 months',
        value: 90 + 1
    },
    {
        name: 'Year to date',
        value: 365 + 1
    },
    {
        name: 'Last 12 months',
        value: 12 * (30 + 1)
    },
    {
        name: 'All time',
        value: 1000
    }
];

export default class StatsController extends Controller {
    rangeOptions = RANGE_OPTIONS;
    audienceOptions = AUDIENCE_TYPES;

    /**
     * @type {number|'all'}
     * Date range to load for member count and MRR related charts
     */
    @tracked chartRange = 30 + 1;
    /**
     * @type {array}
     * Filter by audience
     */
    @tracked audience = [];
    @tracked excludedAudiences = '';

    @action
    onRangeChange(selected) {
        this.chartRange = selected.value;
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

    get selectedRangeOption() {
        return this.rangeOptions.find(d => d.value === this.chartRange);
    }
}
