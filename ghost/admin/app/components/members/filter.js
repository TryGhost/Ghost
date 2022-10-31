import Component from '@glimmer/component';
import moment from 'moment-timezone';
import nql from '@tryghost/nql-lang';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

function escapeNqlString(value) {
    return '\'' + value.replace(/'/g, '\\\'') + '\'';
}

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

const FEEDBACK_RELATION_OPTIONS = [
    {label: 'More like this', name: 1},
    {label: 'Less like this', name: 0}
];

const DATE_RELATION_OPTIONS = [
    {label: 'before', name: 'is-less'},
    {label: 'on or before', name: 'is-or-less'},
    {label: 'after', name: 'is-greater'},
    {label: 'on or after', name: 'is-or-greater'}
];

const NUMBER_RELATION_OPTIONS = [
    {label: 'is', name: 'is'},
    {label: 'is greater than', name: 'is-greater'},
    {label: 'is less than', name: 'is-less'}
];

// Ideally we should move all the filter definitions to separate files
const NAME_FILTER = {
    label: 'Name', 
    name: 'name', 
    group: 'Basic', 
    valueType: 'string', 
    relationOptions: CONTAINS_RELATION_OPTIONS
};

const FILTER_PROPERTIES = [
    // Basic
    NAME_FILTER,
    {
        label: 'Email', 
        name: 'email',
        group: 'Basic', 
        valueType: 'string', 
        relationOptions: CONTAINS_RELATION_OPTIONS
    },
    {
        label: 'Label', 
        name: 'label', 
        group: 'Basic', 
        valueType: 'array', 
        columnLabel: 'Label', 
        relationOptions: MATCH_RELATION_OPTIONS
    },
    {
        label: 'Newsletter subscription', 
        name: 'subscribed', 
        group: 'Basic', 
        columnLabel: 'Subscribed', 
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        options: [
            {label: 'Subscribed', name: 'true'},
            {label: 'Unsubscribed', name: 'false'}
        ]
    },
    {
        label: 'Last seen', 
        name: 'last_seen_at', 
        group: 'Basic', 
        valueType: 'date', 
        columnLabel: 'Last seen at', 
        relationOptions: DATE_RELATION_OPTIONS
    },
    {
        label: 'Created', 
        name: 'created_at', 
        group: 'Basic', 
        valueType: 'date', 
        relationOptions: DATE_RELATION_OPTIONS
    },
    {
        label: 'Signed up on post/page', 
        name: 'signup', 
        group: 'Basic', 
        valueType: 'string', 
        resource: 'post', 
        feature: 'memberAttribution', 
        relationOptions: MATCH_RELATION_OPTIONS,
        getColumns: filter => [
            {
                label: 'Signed up on',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            }
        ]
    },

    // Member subscription
    {
        label: 'Membership tier', 
        name: 'tier', 
        group: 'Subscription', 
        valueType: 'array', 
        columnLabel: 'Membership tier', 
        relationOptions: MATCH_RELATION_OPTIONS
    },
    {
        label: 'Member status', 
        name: 'status', 
        group: 'Subscription', 
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        options: [
            {label: 'Paid', name: 'paid'},
            {label: 'Free', name: 'free'},
            {label: 'Complimentary', name: 'comped'}
        ]
    },
    {
        label: 'Billing period', 
        name: 'subscriptions.plan_interval', 
        group: 'Subscription', 
        columnLabel: 'Billing period', 
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        options: [
            {label: 'Monthly', name: 'month'},
            {label: 'Yearly', name: 'year'}
        ]
    },
    {
        label: 'Stripe subscription status', 
        name: 'subscriptions.status', 
        group: 'Subscription', 
        columnLabel: 'Subscription Status', 
        relationOptions: MATCH_RELATION_OPTIONS,
        valueType: 'options',
        options: [
            {label: 'Active', name: 'active'},
            {label: 'Trialing', name: 'trialing'},
            {label: 'Canceled', name: 'canceled'},
            {label: 'Unpaid', name: 'unpaid'},
            {label: 'Past Due', name: 'past_due'},
            {label: 'Incomplete', name: 'incomplete'},
            {label: 'Incomplete - Expired', name: 'incomplete_expired'}
        ]
    },
    {
        label: 'Paid start date', 
        name: 'subscriptions.start_date', 
        valueType: 'date', 
        group: 'Subscription', 
        columnLabel: 'Paid start date', 
        relationOptions: DATE_RELATION_OPTIONS
    },
    {
        label: 'Next billing date', 
        name: 'subscriptions.current_period_end', 
        valueType: 'date', 
        group: 'Subscription', 
        columnLabel: 'Next billing date', 
        relationOptions: DATE_RELATION_OPTIONS
    },
    {
        label: 'Subscription started on post/page', 
        name: 'conversion', 
        group: 'Subscription', 
        valueType: 'string', 
        resource: 'post', 
        feature: 'memberAttribution', 
        relationOptions: MATCH_RELATION_OPTIONS,
        getColumns: filter => [
            {
                label: 'Subscription started on',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            }
        ]
    },

    // Emails
    {
        label: 'Emails sent (all time)', 
        name: 'email_count', 
        group: 'Email', 
        columnLabel: 'Email count', 
        valueType: 'number', 
        relationOptions: NUMBER_RELATION_OPTIONS
    },
    {
        label: 'Emails opened (all time)', 
        name: 'email_opened_count', 
        group: 'Email', 
        columnLabel: 'Email opened count', 
        valueType: 'number', 
        relationOptions: NUMBER_RELATION_OPTIONS
    },
    {
        label: 'Open rate (all time)', 
        name: 'email_open_rate', 
        group: 'Email', 
        valueType: 'number', 
        relationOptions: NUMBER_RELATION_OPTIONS
    },
    {
        label: 'Received email',
        name: 'emails.post_id', 
        group: 'Email', 
        valueType: 'string', 
        resource: 'email', 
        relationOptions: MATCH_RELATION_OPTIONS,
        getColumns: filter => [
            {
                label: 'Received email',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            }
        ]
    },
    {
        label: 'Opened email', 
        name: 'opened_emails.post_id', 
        group: 'Email', 
        valueType: 'string', 
        resource: 'email', 
        relationOptions: MATCH_RELATION_OPTIONS,
        getColumns: filter => [
            {
                label: 'Opened email',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            }
        ]
    },
    {
        label: 'Clicked email', 
        name: 'clicked_links.post_id', 
        group: 'Email', 
        valueType: 'string', 
        resource: 'email', 
        relationOptions: MATCH_RELATION_OPTIONS,
        getColumns: filter => [
            {
                label: 'Clicked email',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            }
        ]
    },
    {
        label: 'Responded with feedback', 
        name: 'newsletter_feedback', 
        group: 'Email', 
        valueType: 'string', 
        resource: 'email', 
        relationOptions: FEEDBACK_RELATION_OPTIONS,
        feature: 'audienceFeedback', 
        buildNqlFilter: (filter) => {
            // Added brackets to make sure we can parse as a single AND filter
            return `(feedback.post_id:${filter.value}+feedback.score:${filter.relation})`;
        },
        parseNqlFilter: (filter) => {
            if (!filter.$and) {
                return;
            }
            if (filter.$and.length === 2) {
                if (filter.$and[0]['feedback.post_id'] && filter.$and[1]['feedback.score'] !== undefined) {
                    return {
                        relation: parseInt(filter.$and[1]['feedback.score']),
                        value: filter.$and[0]['feedback.post_id']
                    };
                }
            }
        },
        getColumns: filter => [
            {
                label: 'Email',
                getValue: () => {
                    return {
                        class: '',
                        text: filter.resource?.title ?? ''
                    };
                }
            },
            {
                label: 'Feedback',
                getValue: () => {
                    return {
                        class: 'gh-members-list-feedback',
                        text: filter.relation === 1 ? 'More like this' : 'Less like this',
                        icon: filter.relation === 1 ? 'event-more-like-this' : 'event-less-like-this'
                    };
                }
            }
        ]
    }
];

class Filter {
    @tracked value;
    @tracked relation;
    @tracked properties;
    @tracked resource;

    constructor(options) {
        this.properties = options.properties;
        this.timezone = options.timezone ?? 'Etc/UTC';

        let defaultRelation = options.properties.relationOptions[0].name;
        if (options.properties.valueType === 'date') {
            defaultRelation = 'is-or-less';
        }

        let defaultValue = '';
        if (options.properties.valueType === 'options' && options.properties.options.length > 0) {
            defaultValue = options.properties.options[0].name;
        } else if (options.properties.valueType === 'array') {
            defaultValue = [];
        } else if (options.properties.valueType === 'date') {
            defaultValue = moment(moment.tz(this.timezone).format('YYYY-MM-DD')).toDate();
        }

        this.relation = options.relation ?? defaultRelation;

        // date string values are passed in as UTC strings
        // we need to convert them to the site timezone and make a local date that matches
        // so the date string output in the filter inputs is correct
        this.value = options.value ?? defaultValue;

        if (this.properties.valueType === 'date' && typeof this.value === 'string') {
            // Convert string to Date
            this.value = moment(moment.tz(moment.utc(options.value), this.timezone).format('YYYY-MM-DD')).toDate();
        }

        // Validate value
        if (options.properties.valueType === 'options') {
            if (!options.properties.options.find(option => option.name === this.value)) {
                this.value = defaultValue;
            }
        }

        this.resource = null;
    }

    get valueType() {
        return this.properties.valueType;
    }

    get type() {
        return this.properties.name;
    }

    get isResourceFilter() {
        return typeof this.properties.resource === 'string' && this.properties.valueType === 'string';
    }

    get relationOptions() {
        return this.properties.relationOptions;
    }

    get options() {
        return this.properties.options ?? [];
    }

    get isValid() {
        if (Array.isArray(this.value)) {
            return !!this.value.length;
        }
        return !!this.value;
    }
}

export default class MembersFilter extends Component {
    @service feature;
    @service session;
    @service settings;
    @service store;

    @tracked filters = new TrackedArray([
        new Filter({
            properties: NAME_FILTER
        })
    ]);

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
            // check if it is different before parsing
            const validFilters = this.validFilters;
            const currentFilter = this.generateNqlFilter(validFilters);

            if (currentFilter !== this.args.defaultFilterParam) {
                this.parseNqlFilterString(this.args.defaultFilterParam);

                // Pass the parsed filter to the parent component
                // this doesn't start a new network request, and doesn't update filterParam again
                this.applyParsedFilter();
            }
        }
    }

    @action
    addFilter() {
        this.filters.push(new Filter({
            properties: NAME_FILTER
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
            const filterProperty = FILTER_PROPERTIES.find(prop => prop.name === filter.type);

            if (filterProperty.buildNqlFilter) {
                query += `${filterProperty.buildNqlFilter(filter)}+`;
                return;
            }
            const relationStr = this.getFilterRelationOperator(filter.relation);

            if (filterProperty.valueType === 'array' && filter.value?.length) {
                const filterValue = '[' + filter.value.join(',') + ']';
                query += `${filter.type}:${relationStr}${filterValue}+`;
            } else if (filterProperty.valueType === 'string') {
                let filterValue = escapeNqlString(filter.value);
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

    parseNqlFilterString(filterParam) {
        let filters;

        try {
            filters = nql.parse(filterParam);
        } catch (e) {
            // Invalid nql filter
            this.filters = new TrackedArray([]);
            return;
        }
        this.filters = new TrackedArray(this.parseNqlFilter(filters));
    }

    parseNqlFilter(filter) {
        const parsedFilters = [];

        // Check custom parsing
        for (const filterProperties of FILTER_PROPERTIES) {
            if (filterProperties.parseNqlFilter) {
                // This filter has a custom parsing function
                const parsedFilter = filterProperties.parseNqlFilter(filter);
                if (parsedFilter) {
                    parsedFilters.push(new Filter({
                        properties: filterProperties,
                        timezone: this.settings.timezone,
                        ...parsedFilter
                    }));
                    return parsedFilters;
                }
            }
        }

        if (filter.$and) {
            parsedFilters.push(...this.parseNqlFilters(filter.$and));
        } else if (filter.yg) {
            // Single filter grouped in backets
            parsedFilters.push(...this.parseNqlFilter(filter.yg));
        } else {
            const filterKeys = Object.keys(filter);
            const validKeys = FILTER_PROPERTIES.map(prop => prop.name);

            for (const key of filterKeys) {
                if (validKeys.includes(key)) {
                    const parsedFilter = this.parseNqlFilterKey({
                        [key]: filter[key]
                    });
                    if (parsedFilter) {
                        parsedFilters.push(parsedFilter);
                    }
                }
            }
        }
        return parsedFilters;
    }

    /**
     * Parses an array of filters
     */
    parseNqlFilters(filters) {
        const parsedFilters = [];

        for (const filter of filters) {
            parsedFilters.push(...this.parseNqlFilter(filter));
        }

        return parsedFilters;
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
            const properties = FILTER_PROPERTIES.find(prop => key === prop.name);
            if (FILTER_PROPERTIES.find(prop => key === prop.name)) {
                return new Filter({
                    properties,
                    relation,
                    value,
                    timezone: this.settings.timezone
                });
            }
        }
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

        if (!newProp) {
            // eslint-disable-next-line no-console
            console.warn('Invalid Filter Type Selected', newType);
            return;
        }

        const newFilter = new Filter({
            properties: newProp,
            timezone: this.settings.timezone
        });

        const filterToSwap = this.filters.find(f => f === filter);
        this.filters[this.filters.indexOf(filterToSwap)] = newFilter;

        if (newFilter.isValid) {
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
        filter.resource = null;
        this.applySoftFilter();
    }

    @action
    setResourceValue(filter, resource) {
        filter.value = resource.id;
        filter.resource = resource;
        this.applySoftFilter();
    }

    get validFilters() {
        return this.filters.filter(filter => filter.isValid);
    }

    @action
    applySoftFilter() {
        const validFilters = this.validFilters;
        const query = this.generateNqlFilter(validFilters);
        this.args.onApplySoftFilter(query, validFilters);
        this.fetchFilterResourcesTask.perform();
    }

    @action
    applyFilter() {
        const validFilters = this.validFilters;
        const query = this.generateNqlFilter(validFilters);
        this.args.onApplyFilter(query, validFilters);
        this.fetchFilterResourcesTask.perform();
    }

    @action 
    applyFiltersPressed(dropdown) {
        dropdown?.actions.close();
        this.applyFilter();
    }

    @action
    applyParsedFilter() {
        const validFilters = this.validFilters;
        this.args.onApplyParsedFilter(validFilters);
        this.fetchFilterResourcesTask.perform();
    }

    @action
    resetFilter() {
        const filters = [];

        filters.push(new Filter({
            properties: NAME_FILTER
        }));

        this.filters = new TrackedArray(filters);
        this.args.onResetFilter();
    }

    @task({drop: true})
    *fetchTiers() {
        const response = yield this.store.query('tier', {filter: 'type:paid'});
        this.tiersList = response;
    }

    @task({restartable: true})
    *fetchFilterResourcesTask() {
        const ids = [];
        for (const filter of this.filters) {
            if (filter.isResourceFilter) {
                // for now we only support post filters
                if (filter.value && !ids.includes(filter.value)) {
                    ids.push(filter.value);
                }
            }
        }
        if (ids.length > 0) {
            const posts = yield this.store.query('post', {limit: 'all', filter: `id:[${ids.join(',')}]`});

            for (const filter of this.filters) {
                if (filter.isResourceFilter) {
                    // for now we only support post filters
                    if (filter.value) {
                        const post = posts.find(p => p.id === filter.value);
                        if (post) {
                            filter.resource = post;
                        }
                    }
                }
            }
        }
    }
}
