import Component from '@glimmer/component';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhMemberLabelInput extends Component {
    @service store;
    @service labelsManager;

    @tracked _searchedLabels = new TrackedArray();

    _searchedLabelsQuery = null;
    _searchedLabelsMeta = null;

    _powerSelectAPI = null;

    get availableLabels() {
        const selectedLabels = this.selectedLabels;
        return this.labelsManager.labels.filter(label => !selectedLabels.includes(label));
    }

    get useServerSideSearch() {
        return !this.labelsManager.hasLoadedAll;
    }

    get selectedLabels() {
        if (typeof this.args.labels === 'object') {
            if (this.args.labels?.length && typeof this.args.labels[0] === 'string') {
                return this.args.labels.map((d) => {
                    return this.labelsManager.findBySlug(d);
                }).filter(Boolean);
            }
            return this.args.labels || [];
        }
        return [];
    }

    @action
    addSearchedLabels(labels) {
        const existingIds = new Set([
            ...this.selectedLabels.map(l => l.id),
            ...this._searchedLabels.map(l => l.id)
        ]);
        const deduplicatedLabels = labels.filter(label => !existingIds.has(label.id));
        this._searchedLabels.push(...deduplicatedLabels);
    }

    @action
    registerPowerSelectAPI(api) {
        this._powerSelectAPI = api;
    }

    @action
    async loadInitialLabels() {
        if (!this.labelsManager.hasLoaded) {
            await this.labelsManager.loadMoreTask.perform();
        }
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
            this.addSearchedLabels(labels.toArray());
            this._searchedLabelsMeta = labels.meta;
        } else {
            yield this.labelsManager.loadMoreTask.perform();
        }
    }

    @task({restartable: true})
    *searchLabelsTask(term) {
        this._searchedLabelsQuery = term;
        const labels = yield this.labelsManager.searchLabelsTask.perform(term);
        this._searchedLabelsMeta = labels.meta;

        this._searchedLabels = new TrackedArray();
        this.addSearchedLabels(labels.toArray());
        return this._searchedLabels;
    }

    @action
    showCreateWhen(term) {
        const availableLabelNames = this._searchedLabels.map(label => label.name.toLowerCase());
        availableLabelNames.push(...this.selectedLabels.map(label => label.name.toLowerCase()));

        const foundMatchingLabelName = availableLabelNames.includes(term.toLowerCase());
        return !foundMatchingLabelName;
    }

    willDestroy() {
        super.willDestroy?.(...arguments);
        this.store.peekAll('label').forEach((label) => {
            if (label.get('isNew')) {
                this.store.deleteRecord(label);
            }
        });
    }

    @action
    updateLabels(newLabels) {
        let currentLabels = this.selectedLabels;

        // destroy new+unsaved labels that are no longer selected
        currentLabels.forEach(function (label) {
            if (!newLabels.includes(label) && label.get('isNew')) {
                label.destroyRecord();
            }
        });

        this.args.onChange(newLabels);
    }

    @action
    editLabel(label, event) {
        event.stopPropagation();
        this.args.onLabelEdit?.(label.slug);
    }

    @action
    createLabel(labelName) {
        let currentLabels = this.selectedLabels;
        let currentLabelNames = currentLabels.map(label => label.get('name').toLowerCase());
        let labelToAdd;

        labelName = labelName.trim();

        // abort if label is already selected
        if (currentLabelNames.includes(labelName.toLowerCase())) {
            return;
        }

        // find existing label if there is one
        labelToAdd = this._findLabelByName(labelName);

        // create new label if no match
        if (!labelToAdd) {
            labelToAdd = this.store.createRecord('label', {
                name: labelName
            });
        }

        // push label onto member relationship
        currentLabels.pushObject(labelToAdd);
        this.args.onChange(currentLabels);
    }

    _findLabelByName(name) {
        let withMatchingName = function (label) {
            if (label.__isSuggestion__) {
                return false;
            }
            return label.name.toLowerCase() === name.toLowerCase();
        };
        return this._searchedLabels.find(withMatchingName) || this.labelsManager.labels.find(withMatchingName);
    }
}
