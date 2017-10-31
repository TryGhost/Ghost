import Component from '@ember/component';
import ValidationState from 'ghost-admin/mixins/validation-state';
import {alias, readOnly} from '@ember/object/computed';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';

export default Component.extend(ValidationState, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass', 'navItem.isNew::gh-blognav-item--sortable'],

    new: false,

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

        updateLabel(value) {
            this.sendAction('updateLabel', value, this.get('navItem'));
        },

        clearLabelErrors() {
            this.get('navItem.errors').remove('label');
        },

        clearUrlErrors() {
            this.get('navItem.errors').remove('url');
        }
    }
});
