import Service, {inject as service} from '@ember/service';
import {TrackedArray} from 'tracked-built-ins';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const PAGE_SIZE = 100;

export default class LabelsManagerService extends Service {
    @service store;

    @tracked _labels = new TrackedArray();
    @tracked _meta = null;

    get labels() {
        return this.sortLabels(this._labels);
    }

    get hasLoaded() {
        return !!this._meta;
    }

    get hasLoadedAll() {
        return this.hasLoaded && parseInt(this._meta.pagination.pages, 10) === parseInt(this._meta.pagination.page, 10);
    }

    sortLabels(labels = []) {
        return labels
            .filter(label => label.get('id') !== null)
            .sort((labelA, labelB) => (labelA.name || '').localeCompare((labelB.name || '')));
    }

    findBySlug(slug) {
        return this._labels.find(label => label.slug === slug) || this.store.peekAll('label').find(label => label.slug === slug);
    }

    addLabel(label) {
        if (!this._labels.includes(label)) {
            this._labels.push(label);
        }
    }

    removeLabel(label) {
        const index = this._labels.indexOf(label);
        if (index > -1) {
            this._labels.splice(index, 1);
        }
    }

    reset() {
        this._labels = new TrackedArray();
        this._meta = null;
    }

    @task({drop: true})
    *loadMoreTask() {
        if (this._meta?.pagination && parseInt(this._meta.pagination.pages, 10) <= parseInt(this._meta.pagination.page, 10)) {
            return;
        }

        const page = this._meta?.pagination.page ? this._meta.pagination.page + 1 : 1;
        const labels = yield this.store.query('label', {limit: PAGE_SIZE, page, order: 'name asc'});

        const existingSlugs = new Set(this._labels.map(l => l.slug));
        labels.forEach((label) => {
            if (!existingSlugs.has(label.slug)) {
                this._labels.push(label);
            }
        });

        this._meta = labels.meta;
    }

    @task({restartable: true})
    *searchLabelsTask(term, {page = 1} = {}) {
        yield timeout(250);
        const safeTerm = term.replace(/'/g, `\\'`);
        const labels = yield this.store.query('label', {filter: `name:~'${safeTerm}'`, limit: PAGE_SIZE, page, order: 'name asc'});

        // Register search results so they can be resolved by findBySlug/selectedOptions
        // even if they weren't in the initially paginated set
        labels.forEach(label => this.addLabel(label));

        return labels;
    }
}
