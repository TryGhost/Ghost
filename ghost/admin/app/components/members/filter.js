import Component from '@glimmer/component';
import moment from 'moment-timezone';
import nql from '@tryghost/nql-lang';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    {label: 'Name', name: 'name', group: 'Basic', valueType: 'text'},
    {label: 'Email', name: 'email', group: 'Basic', valueType: 'text'},
    // {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Label', name: 'label', group: 'Basic', valueType: 'array'},
    {label: 'Newsletter subscription', name: 'subscribed', group: 'Basic'},
    {label: 'Last seen', name: 'last_seen_at', group: 'Basic', valueType: 'date'},
    {label: 'Created', name: 'created_at', group: 'Basic', valueType: 'date'},
    {label: 'Signed up on post/page', name: 'signup', group: 'Basic', valueType: 'array', feature: 'memberAttribution'},

    // Member subscription
    {label: 'Membership tier', name: 'tier', group: 'Subscription', valueType: 'array'},
    {label: 'Member status', name: 'status', group: 'Subscription'},
    {label: 'Billing period', name: 'subscriptions.plan_interval', group: 'Subscription'},
    {label: 'Stripe subscription status', name: 'subscriptions.status', group: 'Subscription'},
    {label: 'Paid start date', name: 'subscriptions.start_date', valueType: 'date', group: 'Subscription'},
    {label: 'Next billing date', name: 'subscriptions.current_period_end', valueType: 'date', group: 'Subscription'},
    {label: 'Subscription started on post/page', name: 'conversion', group: 'Subscription', valueType: 'array', feature: 'memberAttribution'},

    // Emails
    {label: 'Emails sent (all time)', name: 'email_count', group: 'Email'},
    {label: 'Emails opened (all time)', name: 'email_opened_count', group: 'Email'},
    {label: 'Open rate (all time)', name: 'email_open_rate', group: 'Email'},
    {label: 'Received email', name: 'emails.post_id', group: 'Email', valueType: 'array'},
    {label: 'Opened email', name: 'opened_emails.post_id', group: 'Email', valueType: 'array'},
    {label: 'Clicked email', name: 'clicked_links.post_id', group: 'Email', valueType: 'array'}

    // {label: 'Emails sent (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (30 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails sent (60 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (60 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (60 days)', name: 'x', group: 'Email'},
];

const MATCH_RELATION_OPTIONS = [
    {label: 'is', name: 'is'},
    {label: 'is not', name: 'is-not'}
];

const CONTAINS_RELATION_OPTIONS = [
    {label: 'is', name: 'is'},
    {label: 'contains', name: 'contains'},
    {label: 'does not contain', name: 'does-not-contain'},
    {label: 'starts with', name: 'starts-with'},
    {label: 'ends with', name: 'ends-with'}
];

const DATE_RELATION_OPTIONS = [
    {label: 'before', name: 'is-less'},
    {label: 'on or before', name: 'is-or-less'},
    // TODO: these cause problems because they require multiple NQL statements, eg:
    // created_at:>='2022-03-02 00:00'+created_at:<'2022-03-03 00:00'
    // {label: 'on', name: 'is'},
    // {label: 'not on', name: 'is-not'},
    {label: 'after', name: 'is-greater'},
    {label: 'on or after', name: 'is-or-greater'}
];

const NUMBER_RELATION_OPTIONS = [
    {label: 'is', name: 'is'},
    {label: 'is greater than', name: 'is-greater'},
    {label: 'is less than', name: 'is-less'}
];

const FILTER_RELATIONS_OPTIONS = {
    name: CONTAINS_RELATION_OPTIONS,
    email: CONTAINS_RELATION_OPTIONS,
    label: MATCH_RELATION_OPTIONS,
    tier: MATCH_RELATION_OPTIONS,
    subscribed: MATCH_RELATION_OPTIONS,
    last_seen_at: DATE_RELATION_OPTIONS,
    created_at: DATE_RELATION_OPTIONS,
    status: MATCH_RELATION_OPTIONS,
    'subscriptions.plan_interval': MATCH_RELATION_OPTIONS,
    'subscriptions.status': MATCH_RELATION_OPTIONS,
    'subscriptions.start_date': DATE_RELATION_OPTIONS,
    'subscriptions.current_period_end': DATE_RELATION_OPTIONS,
    email_count: NUMBER_RELATION_OPTIONS,
    email_opened_count: NUMBER_RELATION_OPTIONS,
    email_open_rate: NUMBER_RELATION_OPTIONS,
    signup: MATCH_RELATION_OPTIONS,
    conversion: MATCH_RELATION_OPTIONS,
    'emails.post_id': MATCH_RELATION_OPTIONS,
    'clicked_links.post_id': MATCH_RELATION_OPTIONS,
    'opened_emails.post_id': MATCH_RELATION_OPTIONS
};

const FILTER_VALUE_OPTIONS = {
    'subscriptions.plan_interval': [
        {label: 'Monthly', name: 'month'},
        {label: 'Yearly', name: 'year'}
    ],
    status: [
        {label: 'Paid', name: 'paid'},
        {label: 'Free', name: 'free'},
        {label: 'Complimentary', name: 'comped'}
    ],
    subscribed: [
        {label: 'Subscribed', name: 'true'},
        {label: 'Unsubscribed', name: 'false'}
    ],
    'subscriptions.status': [
        {label: 'Active', name: 'active'},
        {label: 'Trialing', name: 'trialing'},
        {label: 'Canceled', name: 'canceled'},
        {label: 'Unpaid', name: 'unpaid'},
        {label: 'Past Due', name: 'past_due'},
        {label: 'Incomplete', name: 'incomplete'},
        {label: 'Incomplete - Expired', name: 'incomplete_expired'}
    ]
};

class Filter {
    @tracked type;
    @tracked value;
    @tracked relation;
    @tracked relationOptions;

    constructor(options) {
        this.type = options.type;
        this.relation = options.relation;
        this.relationOptions = options.relationOptions;
        this.timezone = options.timezone || 'Etc/UTC';

        const filterProperty = FILTER_PROPERTIES.find(prop => this.type === prop.name);

        // date string values are passed in as UTC strings
        // we need to convert them to the site timezone and make a local date that matches
        // so the date string output in the filter inputs is correct
        const value = filterProperty.valueType === 'date' && typeof options.value === 'string'
            ? moment(moment.tz(moment.utc(options.value), this.timezone).format('YYYY-MM-DD')).toDate()
            : options.value;

        this.value = value;
    }
}

export default class MembersFilter extends Component {
    @service feature;
    @service session;
    @service settings;
    @service store;

    @tracked filters = new TrackedArray([
        new Filter({
            type: 'name',
            relation: 'is',
            value: '',
            relationOptions: FILTER_RELATIONS_OPTIONS.name
        })
    ]);

    availableFilterRelationsOptions = FILTER_RELATIONS_OPTIONS;
    availableFilterValueOptions = FILTER_VALUE_OPTIONS;

    get availableFilterProperties() {
        let availableFilters = FILTER_PROPERTIES;
        const hasMultipleTiers = this.store.peekAll('tier').length > 1;

        // exclude any filters that are behind disabled feature flags
        availableFilters = availableFilters.filter(prop => !prop.feature || this.feature[prop.feature]);

        // exclude tiers filter if site has only single tier
        availableFilters = availableFilters
            .filter((filter) => {
                return filter.name === 'tier' ? hasMultipleTiers : true;
            });

        // exclude subscription filters if Stripe isn't connected
        if (!this.settings.paidMembersEnabled) {
            availableFilters = availableFilters.reject(prop => prop.group === 'Subscription');
        }

        // exclude email filters if email functionality is disabled
        if (this.settings.editorDefaultEmailRecipients === 'disabled') {
            availableFilters = availableFilters.reject(prop => prop.group === 'Email');
        }

        return availableFilters;
    }

    get totalFilters() {
        return this.filters?.length;
    }

    constructor(...args) {
        super(...args);

        this.parseDefaultFilters();
        this.fetchTiers.perform();
    }

    /**
     * This method is not super clean as it uses did-update, but for now this is required to make URL changes work
     * properly.
     * Problem: filter parameter is changed in the members controller by modifying the URL directly
     * -> the filters property is not updated in the members controller because the new parameter is not parsed again
     * -> we need to listen for changes in the property and parse it again
     * -> better future proof solution: move the filter parsing logic elsewhere so it can be parsed in the members controller
     */
    @action
    parseDefaultFilters() {
        if (this.args.defaultFilterParam) {
            this.parseNqlFilter(this.args.defaultFilterParam);

            // Pass the parsed filter to the parent component
            // this doesn't start a new network request, and doesn't update filterParam again
            this.applyParsedFilter();
        }
    }

    @action
    addFilter() {
        this.filters.push(new Filter({
            type: 'name',
            relation: 'is',
            value: '',
            relationOptions: FILTER_RELATIONS_OPTIONS.name
        }));
        this.applySoftFilter();
    }

    @action
    onDropdownClose() {
        this.applyFilter();
    }

    generateNqlFilter(filters) {
        const nqlDateFormat = 'YYYY-MM-DD HH:mm:ss';

        let query = '';
        filters.forEach((filter) => {
            const relationStr = this.getFilterRelationOperator(filter.relation);
            const filterProperty = FILTER_PROPERTIES.find(prop => prop.name === filter.type);

            if (filterProperty.valueType === 'array' && filter.value?.length) {
                const filterValue = '[' + filter.value.join(',') + ']';
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else if (filterProperty.valueType === 'text') {
                const filterValue = '\'' + filter.value.replace(/'/g, '\\\'') + '\'';
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else if (filterProperty.valueType === 'date') {
                let filterValue;

                let tzMoment = moment.tz(moment(filter.value).format('YYYY-MM-DD'), this.settings.timezone);

                if (relationStr === '>') {
                    tzMoment = tzMoment.set({hour: 23, minute: 59, second: 59});
                }
                if (relationStr === '>=') {
                    tzMoment = tzMoment.set({hour: 0, minute: 0, second: 0});
                }
                if (relationStr === '<') {
                    tzMoment = tzMoment.set({hour: 0, minute: 0, second: 0});
                }
                if (relationStr === '<=') {
                    tzMoment = tzMoment.set({hour: 23, minute: 59, second: 59});
                }

                filterValue = `'${tzMoment.utc().format(nqlDateFormat)}'`;
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else {
                const filterValue = (typeof filter.value === 'string' && filter.value.includes(' ')) ? `'${filter.value}'` : filter.value;
                query += `${filter.type}:${relationStr}${filterValue}+`;
            }
        });
        return query.slice(0, -1);
    }

    parseNqlFilterKey(nqlFilter) {
        const keys = Object.keys(nqlFilter);
        const key = keys[0];
        const nqlValue = nqlFilter[key];

        const filterProperty = FILTER_PROPERTIES.find(prop => prop.name === key);

        let relation;
        let value;

        if (typeof nqlValue === 'object') {
            if (nqlValue.$in !== undefined && filterProperty.valueType === 'array') {
                relation = 'is';
                value = nqlValue.$in;
            }

            if (nqlValue.$nin !== undefined && filterProperty.valueType === 'array') {
                relation = 'is-not';
                value = nqlValue.$nin;
            }

            if (nqlValue.$ne !== undefined) {
                relation = 'is-not';
                value = nqlValue.$ne;
            }

            if (nqlValue.$gt !== undefined) {
                relation = 'is-greater';
                value = nqlValue.$gt;
            }

            if (nqlValue.$gte !== undefined) {
                relation = 'is-or-greater';
                value = nqlValue.$gte;
            }

            if (nqlValue.$lt !== undefined) {
                relation = 'is-less';
                value = nqlValue.$lt;
            }

            if (nqlValue.$lte !== undefined) {
                relation = 'is-or-less';
                value = nqlValue.$lte;
            }

            if (nqlValue.$regex !== undefined) {
                const source = nqlValue.$regex.source;

                if (source.indexOf('^') === 0) {
                    relation = 'starts-with';
                    value = source.substring(1);
                } else if (source.indexOf('$') === source.length - 1) {
                    relation = 'ends-with';
                    value = source.slice(0, -1);
                } else {
                    relation = 'contains';
                    value = source;
                }

                value = value.replace(/\\/g, '');
            }

            if (nqlValue.$not !== undefined) {
                relation = 'does-not-contain';
                value = nqlValue.$not.source;

                value = value.replace(/\\/g, '');
            }
        } else {
            relation = 'is';
            value = nqlValue;
        }

        if (typeof value === 'boolean' || typeof value === 'number') {
            // Transform it to a string, to keep it compatible with the internally used value in admin
            // + make sure false and 0 are truthy
            value = value.toString();
        }

        if (relation && value) {
            return new Filter({
                type: key,
                relation,
                relationOptions: FILTER_RELATIONS_OPTIONS[key],
                value,
                timezone: this.settings.timezone
            });
        }
    }

    parseNqlFilter(filterParam) {
        const validKeys = Object.keys(FILTER_RELATIONS_OPTIONS);
        let filters;

        try {
            filters = nql.parse(filterParam);
        } catch (e) {
            // Invalid nql filter
            this.filters = new TrackedArray([]);
            return;
        }

        const filterKeys = Object.keys(filters);

        let filterData = [];

        if (filterKeys?.length === 1 && validKeys.includes(filterKeys[0])) {
            const filterObj = this.parseNqlFilterKey(filters);
            if (filterObj) {
                filterData = [filterObj];
            }
        } else if (filters?.$and) {
            const andFilters = filters?.$and || [];
            filterData = andFilters.filter((nqlFilter) => {
                const _filterKeys = Object.keys(nqlFilter);
                if (_filterKeys?.length === 1 && validKeys.includes(_filterKeys[0])) {
                    return true;
                }
                return false;
            }).map((nqlFilter) => {
                return this.parseNqlFilterKey(nqlFilter);
            }).filter((nqlFilter) => {
                return !!nqlFilter;
            });
        }

        this.filters = new TrackedArray(filterData);
    }

    getFilterRelationOperator(relation) {
        // TODO: unify operator naming with NQL
        const relationMap = {
            'is-less': '<',
            'is-or-less': '<=',
            is: '',
            'is-not': '-',
            'is-greater': '>',
            'is-or-greater': '>=',
            contains: '~',
            'does-not-contain': '-~',
            'starts-with': '~^',
            'ends-with': '~$'
        };

        return relationMap[relation] || '';
    }

    @action
    handleSubmitKeyup(e) {
        e.preventDefault();

        if (e.key === 'Enter') {
            this.applyFilter();
        }
    }

    @action
    deleteFilter(filter, event) {
        event.stopPropagation();
        event.preventDefault();

        if (this.filters.length === 1) {
            this.resetFilter();
        } else {
            this.filters = new TrackedArray(this.filters.reject(f => f === filter));
            this.applySoftFilter();
        }
    }

    @action
    setFilterType(filter, newType) {
        if (newType instanceof Event) {
            newType = newType.target.value;
        }

        const newProp = FILTER_PROPERTIES.find(prop => prop.name === newType);

        let defaultValue = this.availableFilterValueOptions[newType]
            ? this.availableFilterValueOptions[newType][0].name
            : '';

        if (newProp.valueType === 'array' && !defaultValue) {
            defaultValue = [];
        }

        if (newProp.valueType === 'date' && !defaultValue) {
            defaultValue = moment(moment.tz(this.settings.timezone).format('YYYY-MM-DD')).toDate();
        }

        let defaultRelation = this.availableFilterRelationsOptions[newType][0].name;

        if (newProp.valueType === 'date') {
            defaultRelation = 'is-or-less';
        }

        const newFilter = new Filter({
            type: newType,
            relation: defaultRelation,
            relationOptions: this.availableFilterRelationsOptions[newType],
            value: defaultValue,
            timezone: this.settings.timezone
        });

        const filterToSwap = this.filters.find(f => f === filter);
        this.filters[this.filters.indexOf(filterToSwap)] = newFilter;

        if (newType !== 'label' && defaultValue) {
            this.applySoftFilter();
        }

        if (newType !== 'tier' && defaultValue) {
            this.applySoftFilter();
        }
    }

    @action
    setFilterRelation(filter, newRelation) {
        filter.relation = newRelation;
        this.applySoftFilter();
    }

    @action
    setFilterValue(filter, newValue) {
        filter.value = newValue;
        this.applySoftFilter();
    }

    @action
    applySoftFilter() {
        const validFilters = this.filters.filter((filter) => {
            if (Array.isArray(filter.value)) {
                return filter.value.length;
            }
            return filter.value;
        });
        const query = this.generateNqlFilter(validFilters);
        this.args.onApplySoftFilter(query, validFilters);
    }

    @action
    applyFilter() {
        const validFilters = this.filters.filter((filter) => {
            if (Array.isArray(filter.value)) {
                return filter.value.length;
            }
            return filter.value;
        });

        const query = this.generateNqlFilter(validFilters);
        this.args.onApplyFilter(query, validFilters);
    }

    @action
    applyParsedFilter() {
        const validFilters = this.filters.filter((filter) => {
            if (Array.isArray(filter.value)) {
                return filter.value.length;
            }
            return filter.value;
        });

        this.args.onApplyParsedFilter(validFilters);
    }

    @action
    resetFilter() {
        const filters = [];

        filters.push(new Filter({
            type: 'name',
            relation: 'is',
            value: '',
            relationOptions: FILTER_RELATIONS_OPTIONS.name
        }));

        this.filters = new TrackedArray(filters);
        this.args.onResetFilter();
    }

    @task({drop: true})
    *fetchTiers() {
        const response = yield this.store.query('tier', {filter: 'type:paid'});
        this.tiersList = response;
    }
}
