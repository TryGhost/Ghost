import Component from '@ember/component';
import ValidationState from 'ghost-admin/mixins/validation-state';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {run} from '@ember/runloop';

export default Component.extend(ValidationState, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass', 'benefitItem.isNew::gh-blognav-item--sortable'],

    new: false,

    // closure actions
    addItem() {},
    deleteItem() {},
    updateLabel() {},
    label: boundOneWay('benefitItem.label'),

    errors: readOnly('benefitItem.errors'),

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

        updateLabel(value) {
            this.set('label', value);
            return this.updateLabel(value, this.benefitItem);
        },

        clearLabelErrors() {
            if (this.get('benefitItem.errors')) {
                this.get('benefitItem.errors').remove('label');
            }
        }
    },

    keyPress(event) {
        // enter key
        if (event.keyCode === 13 && this.get('benefitItem.isNew')) {
            event.preventDefault();
            run.scheduleOnce('actions', this, this.send, 'addItem', this.benefitItem);
        }
    }
});
