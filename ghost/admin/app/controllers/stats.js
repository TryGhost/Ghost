import Controller from '@ember/controller';
import {AUDIENCE_TYPES, RANGE_OPTIONS} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class StatsController extends Controller {
    queryParams = ['device', 'browser', 'location', 'source', 'pathname'];

    @tracked device = null;
    @tracked browser = null;
    @tracked location = null;
    @tracked source = null;
    @tracked pathname = null;

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
        } else {
            this.excludedAudiences = '';
            this.audience = this.audienceOptions.map(a => a.value);
        }
    }

    @action
    clearFilters() {
        this.device = null;
        this.browser = null;
        this.location = null;
        this.source = null;
        this.pathname = null;
    }

    get selectedRangeOption() {
        return this.rangeOptions.find(d => d.value === this.chartRange);
    }
}
