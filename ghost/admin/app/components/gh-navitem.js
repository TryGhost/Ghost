import Component from '@ember/component';
import ValidationState from 'ghost-admin/mixins/validation-state';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {run} from '@ember/runloop';

export default Component.extend(ValidationState, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass', 'navItem.isNew::gh-blognav-item--sortable'],

    new: false,

    errors: readOnly('navItem.errors'),

    errorClass: computed('hasError', function () {
        if (this.get('hasError')) {
            return 'gh-blognav-item--error';
        }
    }),

    actions: {
        addItem() {
            let action = this.get('addItem');
            if (action) {
                action();
            }
        },

        deleteItem(item) {
            let action = this.get('deleteItem');
            if (action) {
                action(item);
            }
        },

        updateUrl(value) {
            let action = this.get('updateUrl');
            if (action) {
                action(value, this.get('navItem'));
            }
        },

        updateLabel(value) {
            let action = this.get('updateLabel');
            if (action) {
                action(value, this.get('navItem'));
            }
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
            run.scheduleOnce('actions', this, function () {
                this.send('addItem');
            });
        }
    }
});
