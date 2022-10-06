import Component from '@ember/component';
import ValidationState from 'ghost-admin/mixins/validation-state';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {run} from '@ember/runloop';

export default Component.extend(ValidationState, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass', 'navItem.isNew::gh-blognav-item--sortable'],

    new: false,

    // closure actions
    addItem() {},
    deleteItem() {},
    updateUrl() {},
    updateLabel() {},
    label: boundOneWay('navItem.label'),
    url: boundOneWay('navItem.url'),

    errors: readOnly('navItem.errors'),

    errorClass: computed('hasError', function () {
        return this.hasError ? 'gh-blognav-item--error' : '';
    }),

    actions: {
        addItem(item) {
            this.addItem(item);
        },

        deleteItem(item) {
            this.deleteItem(item);
        },

        updateUrl(value) {
            return this.updateUrl(value, this.navItem);
        },

        updateLabel(value) {
            this.set('label', value);
            return this.updateLabel(value, this.navItem);
        },

        clearLabelErrors() {
            this.get('navItem.errors').remove('label');
        },

        clearUrlErrors() {
            this.get('navItem.errors').remove('url');
        }
    },

    keyPress(event) {
        // enter key
        if (event.keyCode === 13 && this.get('navItem.isNew')) {
            event.preventDefault();
            run.scheduleOnce('actions', this, this.send, 'addItem', this.navItem);
        }
    }
});
