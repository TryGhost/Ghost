import Controller from '@ember/controller';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import moment from 'moment';
import {A} from '@ember/array';
import {action} from '@ember/object';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class MembersController extends Controller {
    @service ellaSparse;
    @service store;

    queryParams = ['label'];

    @tracked searchText = '';
    @tracked label = null;
    @tracked members = null;
    @tracked modalLabel = null;
    @tracked showLabelModal = false;

    @tracked _availableLabels = A([]);

    constructor() {
        super(...arguments);
        this.members = this.store.peekAll('member');
        this._availableLabels = this.store.peekAll('label');
    }

    // Computed properties -----------------------------------------------------

    get listHeader() {
        let {searchText, selectedLabel, members} = this;
        if (searchText) {
            return 'Search result';
        }
        if (this.fetchMembersTask.lastSuccessful) {
            let count = pluralize(members.length, 'member');
            if (selectedLabel && selectedLabel.slug) {
                if (members.length > 1) {
                    return `${count} match current filter`;
                } else {
                    return `${count} matches current filter`;
                }
            }
            return count;
        }
        return 'Loading...';
    }

    get showingAll() {
        return !this.searchText && !this.label;
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

    get filteredMembers() {
        let {members, searchText, label} = this;
        searchText = searchText.toLowerCase();

        let filtered = members.filter((member) => {
            if (!searchText) {
                return true;
            }

            let {name, email} = member;
            return (name && name.toLowerCase().indexOf(searchText) >= 0)
                || (email && email.toLowerCase().indexOf(searchText) >= 0);
        }).filter((member) => {
            if (!label) {
                return true;
            }
            return !!member.labels.find((_label) => {
                return _label.slug === label;
            });
        }).sort((a, b) => {
            return b.createdAtUTC.valueOf() - a.createdAtUTC.valueOf();
        });

        return filtered;
    }

    // Actions -----------------------------------------------------------------

    @action
    exportData() {
        let exportUrl = ghostPaths().url.api('members/csv');
        let downloadURL = `${exportUrl}?limit=all`;
        let iframe = document.getElementById('iframeDownload');

        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'iframeDownload';
            iframe.style.display = 'none';
            document.body.append(iframe);
        }
        iframe.setAttribute('src', downloadURL);
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

    // Tasks -------------------------------------------------------------------

    @task
    *fetchMembersTask({forceReload = false} = {}) {
        // use a fixed created_at date so that subsequent pages have a consistent index
        let startDate = new Date();

        // unless we have a forced reload, do not re-fetch the members list unless it's more than a minute old
        // keeps navigation between list->details->list snappy
        if (!forceReload && this._startDate && !(this._startDate - startDate > 1 * 60 * 1000)) {
            return;
        }

        this._startDate = startDate;

        this.members = yield this.ellaSparse.array((range = {}, query = {}) => {
            query = Object.assign({
                limit: range.length,
                page: range.start / range.length,
                order: 'created_at desc',
                filter: `created_at:<='${moment.utc(this._startDate).format('YYYY-MM-DD HH:mm:ss')}'`
            }, query);

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

    @task
    *fetchLabelsTask() {
        if (!this._hasLoadedLabels) {
            yield this.store.query('label', {limit: 'all'}).then(() => {
                this._hasLoadedLabels = true;
            });
        }
    }
}
