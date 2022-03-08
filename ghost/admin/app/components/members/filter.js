import Component from '@glimmer/component';
import moment from 'moment';
import nql from '@nexes/nql-lang';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const FILTER_PROPERTIES = [
    // Basic
    // {label: 'Name', name: 'name', group: 'Basic'},
    // {label: 'Email', name: 'email', group: 'Basic'},
    // {label: 'Location', name: 'location', group: 'Basic'},
    {label: 'Label', name: 'label', group: 'Basic', valueType: 'array'},
    {label: 'Newsletter subscription', name: 'subscribed', group: 'Basic'},
    {label: 'Last seen', name: 'last_seen_at', group: 'Basic', valueType: 'date', feature: 'membersLastSeenFilter'},
    {label: 'Created', name: 'created_at', group: 'Basic', valueType: 'date'},

    // Member subscription
    {label: 'Membership tier', name: 'product', group: 'Subscription', valueType: 'array', feature: 'multipleProducts'},
    {label: 'Member status', name: 'status', group: 'Subscription'},
    // {label: 'Tier', name: 'tier', group: 'Subscription'},
    {label: 'Billing period', name: 'subscriptions.plan_interval', group: 'Subscription'},
    {label: 'Stripe subscription status', name: 'subscriptions.status', group: 'Subscription'},
    {label: 'Paid start date', name: 'subscriptions.start_date', valueType: 'date', group: 'Subscription'},
    {label: 'Next billing date', name: 'subscriptions.current_period_end', valueType: 'date', group: 'Subscription'},

    // Emails
    {label: 'Emails sent (all time)', name: 'email_count', group: 'Email'},
    {label: 'Emails opened (all time)', name: 'email_opened_count', group: 'Email'},
    {label: 'Open rate (all time)', name: 'email_open_rate', group: 'Email'}
    // {label: 'Emails sent (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (30 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (30 days)', name: 'x', group: 'Email'},
    // {label: 'Emails sent (60 days)', name: 'x', group: 'Email'},
    // {label: 'Emails opened (60 days)', name: 'x', group: 'Email'},
    // {label: 'Open rate (60 days)', name: 'x', group: 'Email'},
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

const FILTER_RELATIONS_OPTIONS = {
    // name: [
    //     {label: 'is', name: 'is'},
    //     {label: 'is not', name: 'is-not'}
    // ],
    // email: [
    //     {label: 'is', name: 'is'},
    //     {label: 'is not', name: 'is-not'}
    // ],
    label: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    product: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    subscribed: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    last_seen_at: DATE_RELATION_OPTIONS,
    created_at: DATE_RELATION_OPTIONS,
    status: [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    'subscriptions.plan_interval': [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    'subscriptions.status': [
        {label: 'is', name: 'is'},
        {label: 'is not', name: 'is-not'}
    ],
    'subscriptions.start_date': DATE_RELATION_OPTIONS,
    'subscriptions.current_period_end': DATE_RELATION_OPTIONS,
    email_count: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ],
    email_opened_count: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ],
    email_open_rate: [
        {label: 'is', name: 'is'},
        {label: 'is greater than', name: 'is-greater'},
        {label: 'is less than', name: 'is-less'}
    ]
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
            type: 'label',
            relation: 'is',
            value: [],
            relationOptions: FILTER_RELATIONS_OPTIONS.label
        })
    ]);

    availableFilterRelationsOptions = FILTER_RELATIONS_OPTIONS;
    availableFilterValueOptions = FILTER_VALUE_OPTIONS;

    get availableFilterProperties() {
        let availableFilters = FILTER_PROPERTIES;
        const hasMultipleProducts = this.store.peekAll('product').length > 1;

        // exclude any filters that are behind disabled feature flags
        availableFilters = availableFilters.filter(prop => !prop.feature || this.feature[prop.feature]);

        // exclude tiers filter if site has only single tier
        availableFilters = availableFilters
            .filter((filter) => {
                return filter.name === 'product' ? hasMultipleProducts : true;
            });

        // exclude subscription filters if Stripe isn't connected
        if (!this.settings.get('stripeConnectAccountId')) {
            availableFilters = availableFilters.reject(prop => prop.group === 'Subscription');
        }

        // exclude email filters if email functionality is disabled
        if (this.settings.get('editorDefaultEmailRecipients') === 'disabled') {
            availableFilters = availableFilters.reject(prop => prop.group === 'Email');
        }

        return availableFilters;
    }

    get totalFilters() {
        return this.filters?.length;
    }

    constructor(...args) {
        super(...args);

        if (this.args.defaultFilterParam) {
            this.parseNqlFilter(this.args.defaultFilterParam);
        }

        this.fetchProducts.perform();
    }

    @action
    addFilter() {
        this.filters.push(new Filter({
            type: 'label',
            relation: 'is',
            value: [],
            relationOptions: FILTER_RELATIONS_OPTIONS.label
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
            } else if (filterProperty.valueType === 'date') {
                let filterValue;

                if (relationStr === '>') {
                    const tzMoment = moment.tz(moment(filter.value).format('YYYY-MM-DD'), this.settings.get('timezone')).set({hour: 23, minute: 59, second: 59});
                    filterValue = `'${tzMoment.utc().format(nqlDateFormat)}'`;
                }
                if (relationStr === '>=') {
                    const tzMoment = moment.tz(moment(filter.value).format('YYYY-MM-DD'), this.settings.get('timezone')).set({hour: 0, minute: 0, second: 0});
                    filterValue = `'${tzMoment.utc().format(nqlDateFormat)}'`;
                }
                if (relationStr === '<') {
                    const tzMoment = moment.tz(moment(filter.value).format('YYYY-MM-DD'), this.settings.get('timezone')).set({hour: 0, minute: 0, second: 0});
                    filterValue = `'${tzMoment.utc().format(nqlDateFormat)}'`;
                }
                if (relationStr === '<=') {
                    const tzMoment = moment.tz(moment(filter.value).format('YYYY-MM-DD'), this.settings.get('timeone')).set({hour: 23, minute: 59, second: 59});
                    filterValue = `'${tzMoment.utc().format(nqlDateFormat)}'`;
                }

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
        const value = nqlFilter[key];

        if (typeof value === 'object') {
            if (value.$in !== undefined && ['label', 'product'].includes(key)) {
                return new Filter({
                    type: key,
                    relation: 'is',
                    value: value.$in,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$nin !== undefined && ['label', 'product'].includes(key)) {
                return new Filter({
                    type: key,
                    relation: 'is-not',
                    value: value.$nin,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$ne !== undefined) {
                return new Filter({
                    type: key,
                    relation: 'is-not',
                    value: value.$ne,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$gt !== undefined) {
                return new Filter({
                    type: key,
                    relation: 'is-greater',
                    value: value.$gt,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$gte !== undefined) {
                return new Filter({
                    type: key,
                    relation: 'is-or-greater',
                    value: value.$gte,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$lt !== undefined) {
                return new Filter({
                    type: key,
                    relation: 'is-less',
                    value: value.$lt,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            if (value.$lte !== undefined) {
                return new Filter({
                    type: key,
                    relation: 'is-or-less',
                    value: value.$lte,
                    relationOptions: FILTER_RELATIONS_OPTIONS[key],
                    timezone: this.settings.get('timezone')
                });
            }

            return null;
        } else {
            return new Filter({
                type: key,
                relation: 'is',
                value: value,
                relationOptions: FILTER_RELATIONS_OPTIONS[key]
            });
        }
    }

    parseNqlFilter(filterParam) {
        const validKeys = Object.keys(FILTER_RELATIONS_OPTIONS);
        const filters = nql.parse(filterParam);
        const filterKeys = Object.keys(filters);

        let filterData = [];

        if (filterKeys?.length === 1 && validKeys.includes(filterKeys[0])) {
            const filterObj = this.parseNqlFilterKey(filters);
            filterData = [filterObj];
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
            'is-or-greater': '>='
        };

        return relationMap[relation] || '';
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

        // TODO: move default values to filter type definitions
        if (newType === 'label' && !defaultValue) {
            defaultValue = [];
        }

        if (newType === 'product' && !defaultValue) {
            defaultValue = [];
        }

        if (newProp.valueType === 'date' && !defaultValue) {
            defaultValue = moment(moment.tz(this.settings.get('timezone')).format('YYYY-MM-DD')).toDate();
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
            timezone: this.settings.get('timezone')
        });

        const filterToSwap = this.filters.find(f => f === filter);
        this.filters[this.filters.indexOf(filterToSwap)] = newFilter;

        if (newType !== 'label' && defaultValue) {
            this.applySoftFilter();
        }

        if (newType !== 'product' && defaultValue) {
            this.applySoftFilter();
        }
    }

    @action
    setFilterRelation(filter, newRelation) {
        filter.relation = newRelation;
        this.applySoftFilter();
    }

    @action
    setFilterValue(filterType, filter, filterValue) {
        filter.value = filterValue;
        this.applySoftFilter();
    }

    @action
    applySoftFilter() {
        const validFilters = this.filters.filter((filter) => {
            if (filter.type === 'label') {
                return filter.value?.length;
            }
            if (filter.type === 'product') {
                return filter.value?.length;
            }
            return filter.value;
        });
        const query = this.generateNqlFilter(validFilters);
        this.args.onApplySoftFilter(query, validFilters);
    }

    @action
    applyFilter() {
        const validFilters = this.filters.filter((filter) => {
            if (['label', 'product'].includes(filter.type)) {
                return filter.value?.length;
            }
            return filter.value;
        });

        const query = this.generateNqlFilter(validFilters);
        this.args.onApplyFilter(query, validFilters);
    }

    @action
    resetFilter() {
        this.filters = new TrackedArray([
            new Filter({
                type: 'label',
                relation: 'is',
                value: [],
                relationOptions: FILTER_RELATIONS_OPTIONS.label
            })
        ]);
        this.args.onResetFilter();
    }

    @task({drop: true})
    *fetchProducts() {
        const response = yield this.store.query('product', {filter: 'type:paid'});
        this.productsList = response;
    }
}
