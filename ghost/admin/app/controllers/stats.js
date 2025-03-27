import Controller from '@ember/controller';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {AUDIENCE_TYPES, RANGE_OPTIONS} from 'ghost-admin/utils/stats';
import {STATS_LABEL_MAPPINGS} from '../utils/stats';
import {action} from '@ember/object';
import {capitalizeFirstLetter} from '../helpers/capitalize-first-letter';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

countries.registerLocale(enLocale);

export default class StatsController extends Controller {
    @inject config;

    queryParams = ['device', 'browser', 'location', 'source', 'pathname', 'os', 'timezone'];

    @tracked device = null;
    @tracked browser = null;
    @tracked location = null;
    @tracked source = null;
    @tracked pathname = null;
    @tracked os = null;
    @tracked mockData = false;

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
    @tracked totals = null;

    @action
    onTotalsChange(totals) {
        this.totals = totals;
        const hasNoViews = totals?.visits === '0' && totals?.pageviews === '0';
        this.showStats = !hasNoViews;
    }

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
        this.clearFilters();
    }

    @action
    toggleMockData() {
        this.mockData = !this.mockData;
        this.showStats = true;
        this.totals = null;
    }

    @action
    clearFilters() {
        this.device = null;
        this.browser = null;
        this.location = null;
        this.source = null;
        this.pathname = null;
        this.os = null;
    }

    get selectedRangeOption() {
        return this.rangeOptions.find(d => d.value === this.chartRange);
    }

    get formattedLocation() {
        return STATS_LABEL_MAPPINGS[this.location] || countries.getName(this.location, 'en') || 'Unknown' || null;
    }

    get formattedDevice() {
        return STATS_LABEL_MAPPINGS[this.device] || capitalizeFirstLetter(this.device);
    }

    get formattedSource() {
        return STATS_LABEL_MAPPINGS[this.source] || this.source;
    }

    get formattedOs() {
        return STATS_LABEL_MAPPINGS[this.os] || this.os;
    }
}
