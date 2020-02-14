import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {sort} from '@ember/object/computed';

export default Component.extend({

    store: service(),

    // public attrs
    member: null,
    labelName: '',

    // internal attrs
    _availableLabels: null,

    selectedLabels: computed.reads('member.labels'),

    availableLabels: sort('_availableLabels.[]', function (labelA, labelB) {
        // ignorePunctuation means the # in label names is ignored
        return labelA.name.localeCompare(labelB.name, undefined, {ignorePunctuation: true});
    }),

    availableLabelNames: computed('availableLabels.@each.name', function () {
        return this.availableLabels.map(label => label.name.toLowerCase());
    }),

    init() {
        this._super(...arguments);
        // perform a background query to fetch all users and set `availableLabels`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('label', {limit: 'all'});
        this.set('_availableLabels', this.store.peekAll('label'));
    },

    actions: {
        matchLabels(labelName, term) {
            return labelName.toLowerCase() === term.trim().toLowerCase();
        },

        hideCreateOptionOnMatchingLabel(term) {
            return !this.availableLabelNames.includes(term.toLowerCase());
        },

        updateLabels(newLabels) {
            let currentLabels = this.get('member.labels');

            // destroy new+unsaved labels that are no longer selected
            currentLabels.forEach(function (label) {
                if (!newLabels.includes(label) && label.get('isNew')) {
                    label.destroyRecord();
                }
            });

            // update labels
            return this.set('member.labels', newLabels);
        },

        createLabel(labelName) {
            let currentLabels = this.get('member.labels');
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
            return currentLabels.pushObject(labelToAdd);
        }
    },

    // methods

    _findLabelByName(name) {
        let withMatchingName = function (label) {
            return label.name.toLowerCase() === name.toLowerCase();
        };
        return this.availableLabels.find(withMatchingName);
    }
});
