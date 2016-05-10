import Ember from 'ember';
import {invokeAction} from 'ember-invoke-action';

const {Component, computed, observer, run} = Ember;

export default Component.extend({
    tagName: 'button',
    buttonText: '',
    submitting: false,
    showSpinner: false,
    showSpinnerTimeout: null,
    autoWidth: true,
    fixWidth: false,
    timeout: 1000,

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled', 'type', 'tabindex'],

    disabled: computed('disableWhen', 'showSpinner', function () {
        return this.get('disableWhen') || (this.get('showSpinner') === true);
    }),

    click() {
        invokeAction(this, 'action');
    },

    toggleSpinner: observer('submitting', function () {
        let submitting = this.get('submitting');
        let timeout = this.get('showSpinnerTimeout');

        if (submitting) {
            this.set('showSpinner', true);

            if (this.get('timeout')) {
                this.set('showSpinnerTimeout', run.later(this, function () {
                    if (!this.get('submitting')) {
                        this.set('showSpinner', false);
                    }
                    this.set('showSpinnerTimeout', null);
                }, this.get('timeout')));
            }
        } else if (!submitting && timeout === null) {
            this.set('showSpinner', false);
        }
    }),

    setSize: observer('showSpinner', function () {
        if ((this.get('showSpinner') || this.get('fixWidth')) && this.get('autoWidth')) {
            this.$().width(this.$().width());
            this.$().height(this.$().height());
        } else {
            this.$().width('');
            this.$().height('');
        }
    }),

    willDestroy() {
        this._super(...arguments);
        run.cancel(this.get('showSpinnerTimeout'));
    }
});
