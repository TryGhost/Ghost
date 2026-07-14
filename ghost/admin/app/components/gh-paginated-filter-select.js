import GhPaginatedOptionsComponent from './gh-paginated-options';

// Single-select power-select for filter dropdowns that loads its options a
// page at a time and searches server-side until every option has been loaded.
// `@staticOptions` (e.g. an "All authors" option) are always shown first and
// are excluded from search results.
export default class GhPaginatedFilterSelect extends GhPaginatedOptionsComponent {
    get searchableOptions() {
        const options = this._sortOptions([...this._initialOptions]);

        // keep the selected option visible when it isn't in the loaded pages,
        // e.g. when it was deep-linked via a query param or found via search
        const {selected} = this.args;
        if (selected?.id && !options.some(option => this._optionKey(option) === this._optionKey(selected))) {
            options.push(selected);
        }

        return options;
    }

    get availableOptions() {
        return [...(this.args.staticOptions || []), ...this.searchableOptions];
    }

    _addSearchedOptions(options) {
        super._addSearchedOptions(this._sortOptions(options));
    }
}
