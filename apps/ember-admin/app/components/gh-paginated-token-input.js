import GhPaginatedOptionsComponent from './gh-paginated-options';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';

export default class GhPaginatedTokenInput extends GhPaginatedOptionsComponent {
    constructor() {
        super(...arguments);

        this._initialOptions = new TrackedArray(this.selected);
    }

    get selected() {
        return this._toArray(this.args.selected);
    }

    get availableOptions() {
        return this._sortOptions(this._withoutSelected(this._initialOptions));
    }

    get shouldUseCustomShowCreateWhen() {
        return this.useServerSideSearch && this.args.showCreateWhen;
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

    _addSearchedOptions(options) {
        super._addSearchedOptions(this._withoutSelected(options));
    }

    _withoutSelected(options) {
        const selected = this.selected;
        const selectedKeys = new Set(selected.map(option => this._optionKey(option)));

        return this._toArray(options).filter((option) => {
            return !selectedKeys.has(this._optionKey(option));
        });
    }
}
