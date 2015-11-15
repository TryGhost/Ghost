import Ember from 'ember';

const {Component, computed, observer, run} = Ember;
const {equal} = computed;

export default Component.extend({
    tagName: 'button',
    buttonText: '',
    submitting: false,
    showSpinner: false,
    showSpinnerTimeout: null,
    autoWidth: true,

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled', 'type', 'tabindex'],

    // Must be set on the controller
    disabled: equal('showSpinner', true),

    click() {
        if (this.get('action')) {
            this.sendAction('action');
            return false;
        }
        return true;
    },

    toggleSpinner: observer('submitting', function () {
        let submitting = this.get('submitting');
        let timeout = this.get('showSpinnerTimeout');

        if (submitting) {
            this.set('showSpinner', true);
            this.set('showSpinnerTimeout', run.later(this, function () {
                if (!this.get('submitting')) {
                    this.set('showSpinner', false);
                }
                this.set('showSpinnerTimeout', null);
            }, 1000));
        } else if (!submitting && timeout === null) {
            this.set('showSpinner', false);
        }
    }),

    setSize: observer('showSpinner', function () {
        if (this.get('showSpinner') && this.get('autoWidth')) {
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
