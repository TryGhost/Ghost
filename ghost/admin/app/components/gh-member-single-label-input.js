import Component from '@glimmer/component';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMemberSingleLabelInput extends Component {
    @service store;
    @service labelsManager;

    @tracked _selectedLabel = null;
    @tracked _searchedLabels = new TrackedArray();

    _searchedLabelsQuery = null;
    _searchedLabelsMeta = null;

    _powerSelectAPI = null;

    get availableLabels() {
        return this.labelsManager.labels;
    }

    get useServerSideSearch() {
        return !this.labelsManager.hasLoadedAll;
    }

    constructor(...args) {
        super(...args);
        this.loadInitialLabelsTask.perform();
    }

    @task
    *loadInitialLabelsTask() {
        if (!this.labelsManager.hasLoaded) {
            yield this.labelsManager.loadMoreTask.perform();
        }

        const sorted = this.availableLabels;
        if (this.args.label) {
            const found = sorted.find(l => l.id === this.args.label);
            if (found) {
                this._selectedLabel = found;
            }
        } else {
            this._selectedLabel = sorted[0];
            if (this._selectedLabel) {
                this.args.onChange(this._selectedLabel.id);
            }
        }
    }

    @action
    registerPowerSelectAPI(api) {
        this._powerSelectAPI = api;
    }

    @task({drop: true})
    *loadMoreLabelsTask() {
        const isSearch = !!this._powerSelectAPI?.searchText;
        if (isSearch) {
            if (!this.useServerSideSearch) {
                return;
            }

            if (this.searchLabelsTask.isRunning) {
                return;
            }

            if (!this._searchedLabelsMeta || (this._searchedLabelsMeta.pagination.pages <= this._searchedLabelsMeta.pagination.page)) {
                return;
            }

            const page = this._searchedLabelsMeta.pagination.page + 1;
            const labels = yield this.labelsManager.searchLabelsTask.perform(this._searchedLabelsQuery, {page});
            this._searchedLabels.push(...labels.toArray());
            this._searchedLabelsMeta = labels.meta;
        } else {
            yield this.labelsManager.loadMoreTask.perform();
        }
    }

    @task
    *searchLabelsTask(term) {
        this._searchedLabelsQuery = term;
        const labels = yield this.labelsManager.searchLabelsTask.perform(term);
        this._searchedLabelsMeta = labels.meta;

        this._searchedLabels = new TrackedArray(this.labelsManager.sortLabels(labels.toArray()));
        return this._searchedLabels;
    }

    @action
    updateLabel(label) {
        this._selectedLabel = label;
        this.args.onChange(label?.id);
    }
}
