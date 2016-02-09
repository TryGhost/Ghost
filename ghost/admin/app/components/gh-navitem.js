import Ember from 'ember';
import ValidationState from 'ghost/mixins/validation-state';
import SortableItem from 'ember-sortable/mixins/sortable-item';

const {Component, computed, run} = Ember;
const {alias, readOnly} = computed;

export default Component.extend(ValidationState, SortableItem, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass', 'navItem.isNew::gh-blognav-item--sortable'],

    new: false,
    handle: '.gh-blognav-grab',

    model: alias('navItem'),
    errors: readOnly('navItem.errors'),

    errorClass: computed('hasError', function () {
        if (this.get('hasError')) {
            return 'gh-blognav-item--error';
        }
    }),

    keyPress(event) {
        // enter key
        if (event.keyCode === 13 && this.get('navItem.isNew')) {
            event.preventDefault();
            run.scheduleOnce('actions', this, function () {
                this.send('addItem');
            });
        }
    },

    actions: {
        addItem() {
            this.sendAction('addItem');
        },

        deleteItem(item) {
            this.sendAction('deleteItem', item);
        },

        updateUrl(value) {
            this.sendAction('updateUrl', value, this.get('navItem'));
        },

        clearLabelErrors() {
            this.get('navItem.errors').remove('label');
        },

        clearUrlErrors() {
            this.get('navItem.errors').remove('url');
        }
    }
});
