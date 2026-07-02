import Component from '@glimmer/component';
import {A} from '@ember/array';
import {TrackedArray} from 'tracked-built-ins';
import {action, get} from '@ember/object';
import {
    defaultMatcher,
    filterOptions
} from 'ember-power-select/utils/group-utils';
import {didCancel, task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const DEFAULT_PAGE_SIZE = 100;

export default class GhPaginatedTokenInput extends Component {
    @tracked _initialOptions = new TrackedArray();
    @tracked _searchedOptions = new TrackedArray();
    @tracked _initialOptionsMeta = null;
    @tracked _searchedOptionsMeta = null;

    _hasLoadedInitialOptions = false;
    _searchedOptionsQuery = null;
    _powerSelectAPI = null;

    constructor() {
        super(...arguments);

        this._initialOptions = new TrackedArray(this.selected);
    }

    get selected() {
        return this._toArray(this.args.selected);
    }

    get pageSize() {
        return this.args.pageSize || DEFAULT_PAGE_SIZE;
    }

    get matcher() {
        return this.args.matcher || defaultMatcher;
    }

    get searchField() {
        return this.args.searchField === undefined ? 'name' : this.args.searchField;
    }

    get availableOptions() {
        return this._sortOptions(this._withoutSelected(this._initialOptions));
    }

    get useServerSideSearch() {
        return !this._hasLoadedAll(this._initialOptionsMeta);
    }

    get shouldUseCustomShowCreateWhen() {
        return this.useServerSideSearch && this.args.showCreateWhen;
    }

    @action
    registerPowerSelectAPI(api) {
        this._powerSelectAPI = api;
        this.args.registerAPI?.(api);
    }

    @action
    async loadInitialOptions() {
        if (!this._hasLoadedInitialOptions) {
            try {
                await this.loadMoreOptionsTask.perform();
                this._hasLoadedInitialOptions = true;
            } catch (error) {
                if (!didCancel(error)) {
                    throw error;
                }
            }
        }

        this.args.onOpen?.(...arguments);
    }

    @action
    handleChange(selection, ...args) {
        this._addInitialOptions(this._toArray(selection));
        this.args.onChange?.(selection, ...args);
    }

    @action
    showCreateWhen(term, options) {
        return this.args.showCreateWhen(term, options, {
            initialOptions: this._initialOptions,
            searchedOptions: this._searchedOptions,
            selected: this.selected
        });
    }

    @task({drop: true})
    *loadMoreOptionsTask() {
        const isSearch = !!this._powerSelectAPI?.searchText;

        if (isSearch) {
            if (!this.useServerSideSearch || this.searchOptionsTask.isRunning || !this._hasNextPage(this._searchedOptionsMeta)) {
                return;
            }

            const page = this._nextPage(this._searchedOptionsMeta);
            const searchQuery = this._searchedOptionsQuery;
            const options = yield this.args.searchPage(searchQuery, {limit: this.pageSize, page});

            if (searchQuery !== this._searchedOptionsQuery) {
                return;
            }

            this._addSearchedOptions(this._toArray(options));
            this._searchedOptionsMeta = options.meta;
            return;
        }

        if (!this._hasNextPage(this._initialOptionsMeta)) {
            return;
        }

        const page = this._nextPage(this._initialOptionsMeta);
        const options = yield this.args.loadPage({limit: this.pageSize, page});
        this._addInitialOptions(this._toArray(options));
        this._initialOptionsMeta = options.meta;
    }

    @task({restartable: true})
    *searchOptionsTask(term) {
        if (!this.useServerSideSearch) {
            return this._filter(A(this.availableOptions), term);
        }

        const debounceMs = Number(this.args.searchDebounceMs || 0);

        if (debounceMs > 0) {
            yield timeout(debounceMs);
        }

        this._searchedOptionsQuery = term;
        const options = yield this.args.searchPage(term, {limit: this.pageSize, page: 1});
        this._searchedOptionsMeta = options.meta;

        // A fresh TrackedArray lets vertical-collection render the new search
        // result set, then later append pages as the user scrolls.
        this._searchedOptions = new TrackedArray();
        this._addSearchedOptions(this._toArray(options));

        return this._searchedOptions;
    }

    _addInitialOptions(options) {
        this._pushUnique(this._initialOptions, options);
    }

    _addSearchedOptions(options) {
        this._pushUnique(this._searchedOptions, this._withoutSelected(options));
    }

    _pushUnique(target, options) {
        const existingKeys = new Set(target.map(option => this._optionKey(option)));
        const deduplicatedOptions = options.filter((option) => {
            const key = this._optionKey(option);

            if (existingKeys.has(key)) {
                return false;
            }

            existingKeys.add(key);
            return true;
        });

        target.push(...deduplicatedOptions);
    }

    _withoutSelected(options) {
        const selected = this.selected;
        const selectedKeys = new Set(selected.map(option => this._optionKey(option)));

        return this._toArray(options).filter((option) => {
            return !selectedKeys.has(this._optionKey(option));
        });
    }

    _sortOptions(options) {
        if (this.args.sortOptions) {
            return this.args.sortOptions(options);
        }

        return options;
    }

    _filter(options, searchText) {
        let matcher;
        if (this.searchField) {
            matcher = (option, text) => this.matcher(get(option, this.searchField), text);
        } else {
            matcher = (option, text) => this.matcher(option, text);
        }
        return filterOptions(options || [], searchText, matcher);
    }

    _optionKey(option) {
        return option?.id || option;
    }

    _hasLoadedAll(meta) {
        const pagination = meta?.pagination;

        if (!pagination) {
            return false;
        }

        return Number(pagination.pages) <= Number(pagination.page);
    }

    _hasNextPage(meta) {
        if (!meta) {
            return true;
        }

        return !this._hasLoadedAll(meta);
    }

    _nextPage(meta) {
        return meta?.pagination?.page ? Number(meta.pagination.page) + 1 : 1;
    }

    _toArray(value) {
        if (!value) {
            return [];
        }

        return value.toArray ? value.toArray() : Array.from(value);
    }
}
