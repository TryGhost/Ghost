import Controller from '@ember/controller';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {AUDIENCE_TYPES, RANGE_OPTIONS} from 'ghost-admin/utils/stats';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

countries.registerLocale(enLocale);

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
    @tracked showStats = true;
    @tracked locationHumanReadable = this.location ? (countries.getName(this.location, 'en') || 'Unknown') : null;

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

        const excludedArray = this.excludedAudiences.split(',');
        this.showStats = this.audienceOptions.length !== excludedArray.length;
    }

    @action
    clearAudienceFilter() {
        this.excludedAudiences = '';
        this.audience = this.audienceOptions.map(a => a.value);
        this.showStats = true;
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

    get humanReadableLocation() {
        return this.location ? (countries.getName(this.location, 'en') || 'Unknown') : null;
    }
}
