import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import fetch from 'fetch';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import moment from 'moment';
import {A} from '@ember/array';
import {action} from '@ember/object';
import {capitalize} from '@ember/string';
import {ghPluralize} from 'ghost-admin/helpers/gh-pluralize';
import {resetQueryParams} from 'ghost-admin/helpers/reset-query-params';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const PAID_PARAMS = [{
    name: 'All members',
    value: null
}, {
    name: 'Free members',
    value: 'false'
}, {
    name: 'Paid members',
    value: 'true'
}];

export default class MembersController extends Controller {
    @service ajax;
    @service config;
    @service ellaSparse;
    @service feature;
    @service ghostPaths;
    @service membersStats;
    @service router;
    @service store;

    queryParams = [
        'label',
        {paidParam: 'paid'},
        {searchParam: 'search'},
        {orderParam: 'order'},
        {filterParam: 'filter'}
    ];

    @tracked members = A([]);
    @tracked searchText = '';
    @tracked searchParam = '';
    @tracked filterParam = null;
    @tracked paidParam = null;
    @tracked label = null;
    @tracked orderParam = null;
    @tracked modalLabel = null;
    @tracked showLabelModal = false;
    @tracked showDeleteMembersModal = false;
    @tracked showUnsubscribeMembersModal = false;
    @tracked showAddMembersLabelModal = false;
    @tracked showRemoveMembersLabelModal = false;
    @tracked filters = A([]);

    @tracked _availableLabels = A([]);

    paidParams = PAID_PARAMS;

    constructor() {
        super(...arguments);
        this._availableLabels = this.store.peekAll('label');

        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    // Computed properties -----------------------------------------------------

    get listHeader() {
        let {searchText, selectedLabel, members} = this;

        if (members.loading) {
            return 'Loading...';
        }

        if (searchText) {
            return 'Search result';
        }

        let count = ghPluralize(members.length, 'member');

        if (selectedLabel && selectedLabel.slug) {
            if (members.length > 1) {
                return `${count} match current filter`;
            } else {
                return `${count} matches current filter`;
            }
        }

        return count;
    }

    get showingAll() {
        return !this.searchParam && !this.paidParam && !this.label && !this.filterParam;
    }

    get availableOrders() {
        // don't return anything if email analytics is disabled because
        // we don't want to show an order dropdown with only a single option

        if (this.feature.get('emailAnalytics')) {
            return [{
                name: 'Newest',
                value: null
            }, {
                name: 'Open rate',
                value: 'email_open_rate'
            }];
        }

        return [];
    }

    get selectedOrder() {
        return this.availableOrders.find(order => order.value === this.orderParam);
    }

    get availableLabels() {
        let labels = this._availableLabels
            .filter(label => !label.isNew)
            .filter(label => label.id !== null)
            .sort((labelA, labelB) => labelA.name.localeCompare(labelB.name, undefined, {ignorePunctuation: true}));
        let options = labels.toArray();

        options.unshiftObject({name: 'All labels', slug: null});

        return options;
    }

    get selectedLabel() {
        let {label, availableLabels} = this;
        return availableLabels.findBy('slug', label);
    }

    get labelModalData() {
        let label = this.modalLabel;
        let labels = this.availableLabels;

        return {
            label,
            labels
        };
    }

    get selectedPaidParam() {
        return this.paidParams.findBy('value', this.paidParam) || {value: '!unknown'};
    }

    get isFiltered() {
        return !!(this.label || this.paidParam || this.searchParam || this.filterParam);
    }

    get filterColumns() {
        const defaultColumns = ['name', 'email'];
        return this.filters.map((filter) => {
            return filter.type;
        }).filter((f, idx, arr) => {
            return arr.indexOf(f) === idx;
        }).filter(d => !defaultColumns.includes(d));
    }

    get filterColumnLabels() {
        const filterColumnLabelMap = {
            'subscriptions.plan_interval': 'Billing period',
            subscribed: 'Subscribed to email',
            'subscriptions.status': 'Subscription Status'
        };
        return this.filterColumns.map((d) => {
            return filterColumnLabelMap[d] ? filterColumnLabelMap[d] : capitalize(d.replace(/_/g, ' '));
        });
    }

    getApiQueryObject({params, extraFilters = []} = {}) {
        let {label, paidParam, searchParam, filterParam} = params ? params : this;

        let filters = [];

        filters = filters.concat(extraFilters);

        if (label) {
            filters.push(`label:'${label}'`);
        }

        if (paidParam !== null) {
            if (paidParam === 'true') {
                filters.push('status:-free');
            } else {
                filters.push('status:free');
            }
        }

        if (filterParam && this.feature.get('membersFiltering')) {
            filters.push(filterParam);
        }

        let searchQuery = searchParam ? {search: searchParam} : {};

        return Object.assign({}, {filter: filters.join('+')}, searchQuery);
    }

    // Actions -----------------------------------------------------------------

    @action
    refreshData() {
        this.fetchMembersTask.perform();
        this.fetchLabelsTask.perform();
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();
    }

    @action
    changeOrder(order) {
        this.orderParam = order.value;
    }

    @action
    applyFilter(filterStr, filters) {
        this.filters = filters;
        this.filterParam = filterStr || null;
    }

    @action
    resetFilter() {
        this.filters = A([]);
        this.filterParam = null;
    }

    @action
    search(e) {
        this.searchTask.perform(e.target.value);
    }

    @action
    exportData() {
        let exportUrl = ghostPaths().url.api('members/upload');
        let downloadParams = new URLSearchParams(this.getApiQueryObject());
        downloadParams.set('limit', 'all');

        let iframe = document.getElementById('iframeDownload');

        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'iframeDownload';
            iframe.style.display = 'none';
            document.body.append(iframe);
        }
        iframe.setAttribute('src', `${exportUrl}?${downloadParams.toString()}`);
    }

    @action
    changeLabel(label, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.label = label.slug;
    }

    @action
    addLabel(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newLabel = this.store.createRecord('label');
        this.modalLabel = newLabel;
        this.showLabelModal = !this.showLabelModal;
    }

    @action
    editLabel(label, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        let modalLabel = this.availableLabels.findBy('slug', label);
        this.modalLabel = modalLabel;
        this.showLabelModal = !this.showLabelModal;
    }

    @action
    toggleLabelModal() {
        this.showLabelModal = !this.showLabelModal;
    }

    @action
    changePaidParam(paid) {
        this.paidParam = paid.value;
    }

    @action
    toggleDeleteMembersModal() {
        this.showDeleteMembersModal = !this.showDeleteMembersModal;
    }

    @action
    toggleUnsubscribeMembersModal() {
        this.showUnsubscribeMembersModal = !this.showUnsubscribeMembersModal;
    }

    @action
    toggleAddMembersLabelModal() {
        this.showAddMembersLabelModal = !this.showAddMembersLabelModal;
    }

    @action
    toggleRemoveMembersLabelModal() {
        this.showRemoveMembersLabelModal = !this.showRemoveMembersLabelModal;
    }

    @action
    deleteMembers() {
        return this.deleteMembersTask.perform();
    }

    @action
    unsubscribeMembers() {
        return this.unsubscribeMembersTask.perform();
    }

    @action
    addLabelToMembers(selectedLabel) {
        return this.addLabelToMembersTask.perform(selectedLabel);
    }

    @action
    removeLabelFromMembers(selectedLabel) {
        return this.removeLabelFromMembersTask.perform(selectedLabel);
    }

    // Tasks -------------------------------------------------------------------

    @task({restartable: true})
    *searchTask(query) {
        yield timeout(250); // debounce
        this.searchParam = query;
    }

    @task
    *fetchLabelsTask() {
        yield this.store.query('label', {limit: 'all'});
    }

    @task({restartable: true})
    *fetchMembersTask(params) {
        // params is undefined when called as a "refresh" of the model
        let {label, paidParam, searchParam, orderParam, filterParam} = typeof params === 'undefined' ? this : params;

        if (!searchParam) {
            this.resetSearch();
        }

        // use a fixed created_at date so that subsequent pages have a consistent index
        let startDate = new Date();

        // bypass the stale data shortcut if params change
        let forceReload = !params
            || label !== this._lastLabel
            || paidParam !== this._lastPaidParam
            || searchParam !== this._lastSearchParam
            || orderParam !== this._lastOrderParam
            || filterParam !== this._lastFilterParam;
        this._lastLabel = label;
        this._lastPaidParam = paidParam;
        this._lastSearchParam = searchParam;
        this._lastOrderParam = orderParam;
        this._lastFilterParam = filterParam;

        // unless we have a forced reload, do not re-fetch the members list unless it's more than a minute old
        // keeps navigation between list->details->list snappy
        if (!forceReload && this._startDate && !(this._startDate - startDate > 1 * 60 * 1000)) {
            return this.members;
        }

        this._startDate = startDate;

        this.members = yield this.ellaSparse.array((range = {}, query = {}) => {
            const searchQuery = this.getApiQueryObject({
                params,
                extraFilters: [`created_at:<='${moment.utc(this._startDate).format('YYYY-MM-DD HH:mm:ss')}'`]
            });
            const order = orderParam ? `${orderParam} desc` : `created_at desc`;

            query = Object.assign({
                order,
                limit: range.length,
                page: range.page
            }, searchQuery, query);

            return this.store.query('member', query).then((result) => {
                return {
                    data: result,
                    total: result.meta.pagination.total
                };
            });
        }, {
            limit: 50
        });
    }

    @task({drop: true})
    *deleteMembersTask() {
        const query = new URLSearchParams(this.getApiQueryObject());

        // Trigger download before deleting. Uses the CSV export endpoint but
        // needs to fetch the file and trigger a download directly rather than
        // via an iframe. The iframe approach can't tell us when a download has
        // started/finished meaning we could end up deleting the data before exporting it
        const exportUrl = ghostPaths().url.api('members/upload');
        const exportParams = new URLSearchParams(this.getApiQueryObject());
        exportParams.set('limit', 'all');

        yield fetch(exportUrl, {method: 'GET'})
            .then(res => res.blob())
            .then((blob) => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `members.${moment().format('YYYY-MM-DD')}.csv`;
                document.body.appendChild(a);
                if (!this.isTesting) {
                    a.click();
                }
                a.remove();
                URL.revokeObjectURL(blobUrl);
            });

        // backup downloaded, continue with deletion

        const deleteUrl = `${this.ghostPaths.url.api('members')}?${query}`;

        // response contains details of which members failed to be deleted
        const response = yield this.ajax.del(deleteUrl);

        // reset and reload
        this.store.unloadAll('member');
        this.router.transitionTo('members.index', {queryParams: Object.assign(resetQueryParams('members.index'))});
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();

        return response.meta;
    }

    @task({drop: true})
    *unsubscribeMembersTask() {
        const query = new URLSearchParams(this.getApiQueryObject());
        const unsubscribeUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
        // response contains details of which members failed to be unsubscribe
        const response = yield this.ajax.put(unsubscribeUrl, {
            data: {
                action: 'unsubscribe',
                meta: {}
            }
        });

        // reset and reload
        this.store.unloadAll('member');
        this.router.transitionTo('members.index', {queryParams: Object.assign(resetQueryParams('members.index', {filter: this.filterParam, search: null}))});
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();

        return response.meta;
    }

    @task({drop: true})
    *addLabelToMembersTask(selectedLabel) {
        const query = new URLSearchParams(this.getApiQueryObject());
        const addLabelUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
        const response = yield this.ajax.put(addLabelUrl, {
            data: {
                action: 'addLabel',
                meta: {
                    label: {
                        id: selectedLabel
                    }
                }
            }
        });

        // reset and reload
        this.store.unloadAll('member');
        this.router.transitionTo('members.index', {queryParams: Object.assign(resetQueryParams('members.index', {filter: this.filterParam, search: null}))});
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();

        return response.meta;
    }

    @task({drop: true})
    *removeLabelFromMembersTask(selectedLabel) {
        const query = new URLSearchParams(this.getApiQueryObject());
        const removeLabelUrl = `${this.ghostPaths.url.api('members/bulk')}?${query}`;
        const response = yield this.ajax.put(removeLabelUrl, {
            data: {
                action: 'removeLabel',
                meta: {
                    label: {
                        id: selectedLabel
                    }
                }
            }
        });

        // reset and reload
        this.store.unloadAll('member');
        this.router.transitionTo('members.index', {queryParams: Object.assign(resetQueryParams('members.index', {filter: this.filterParam, search: null}))});
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();

        return response.meta;
    }
    // Internal ----------------------------------------------------------------

    resetSearch() {
        this.searchText = '';
    }

    reset() {
        this.filterParam = null;
    }

    reload(params) {
        this.membersStats.invalidate();
        this.membersStats.fetchCounts();
        this.fetchMembersTask.perform(params);
    }
}
