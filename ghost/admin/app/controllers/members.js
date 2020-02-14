import Controller from '@ember/controller';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import moment from 'moment';
import {computed} from '@ember/object';
import {get} from '@ember/object';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    store: service(),

    queryParams: ['label'],

    label: null,
    members: null,
    searchText: '',
    modalLabel: null,
    showLabelModal: false,

    _hasLoadedLabels: false,
    _availableLabels: null,

    init() {
        this._super(...arguments);
        this.set('members', this.store.peekAll('member'));
        this._availableLabels = this.store.peekAll('label');
    },

    listHeader: computed('selectedLabel', 'searchText', function () {
        let {searchText, selectedLabel, filteredMembers} = this;
        if (searchText) {
            return 'Search result';
        }
        if (this.fetchMembers.lastSuccessful) {
            let count = pluralize(filteredMembers.length, 'member');
            if (selectedLabel && selectedLabel.slug) {
                if (filteredMembers.length > 1) {
                    return `${count} match current filter`;
                } else {
                    return `${count} matches current filter`;
                }
            }
            return count;
        }
        return 'Loading...';
    }),

    showingAll: computed('label', 'searchText', function () {
        let {searchText, label} = this;

        return !searchText && !label;
    }),

    availableLabels: computed('_availableLabels.@each.{isNew}', function () {
        let labels = this._availableLabels
            .filter(label => !label.get('isNew'))
            .filter(label => label.get('id') !== null)
            .sort((labelA, labelB) => labelA.name.localeCompare(labelB.name, undefined, {ignorePunctuation: true}));
        let options = labels.toArray();

        options.unshiftObject({name: 'All labels', slug: null});

        return options;
    }),

    selectedLabel: computed('label', 'availableLabels', function () {
        let label = this.get('label');
        let labels = this.get('availableLabels');

        return labels.findBy('slug', label);
    }),

    labelModalData: computed('modalLabel', 'availableLabels', function () {
        let label = this.get('modalLabel');
        let labels = this.get('availableLabels');

        return {
            label,
            labels
        };
    }),

    filteredMembers: computed('members.@each.{name,email}', 'searchText', 'label', function () {
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
            return b.get('createdAtUTC').valueOf() - a.get('createdAtUTC').valueOf();
        });

        return filtered;
    }),

    actions: {
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
        },
        changeLabel(label, e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.set('label', get(label, 'slug'));
        },
        addLabel(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const newLabel = this.store.createRecord('label');
            this.set('modalLabel', newLabel);
            this.toggleProperty('showLabelModal');
        },
        editLabel(label, e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            let labels = this.get('availableLabels');

            let modalLabel = labels.findBy('slug', label);
            this.set('modalLabel', modalLabel);
            this.toggleProperty('showLabelModal');
        },
        toggleLabelModal() {
            this.toggleProperty('showLabelModal');
        }
    },

    fetchMembers: task(function* () {
        let newFetchDate = new Date();

        if (this._hasFetchedAll) {
            // fetch any records modified since last fetch
            yield this.store.query('member', {
                limit: 'all',
                filter: `updated_at:>='${moment.utc(this._lastFetchDate).format('YYYY-MM-DD HH:mm:ss')}'`,
                order: 'created_at desc'
            });
        } else {
            // fetch all records
            yield this.store.query('member', {
                limit: 'all',
                order: 'created_at desc'
            });
            this._hasFetchedAll = true;
        }

        this._lastFetchDate = newFetchDate;
    })
});
