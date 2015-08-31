import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'button',
    buttonText: '',
    submitting: false,
    showSpinner: false,
    showSpinnerTimeout: null,
    autoWidth: true,

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled', 'type', 'tabindex'],

    // Must be set on the controller
    disabled: Ember.computed.equal('showSpinner', true),

    click: function () {
        if (this.get('action')) {
            this.sendAction('action');
            return false;
        }
        return true;
    },

    toggleSpinner: Ember.observer('submitting', function () {
        var submitting = this.get('submitting'),
            timeout = this.get('showSpinnerTimeout');

        if (submitting) {
            this.set('showSpinner', true);
            this.set('showSpinnerTimeout', Ember.run.later(this, function () {
                if (!this.get('submitting')) {
                    this.set('showSpinner', false);
                }
                this.set('showSpinnerTimeout', null);
            }, 1000));
        } else if (!submitting && timeout === null) {
            this.set('showSpinner', false);
        }
    }),

    setSize: Ember.observer('showSpinner', function () {
        if (this.get('showSpinner') && this.get('autoWidth')) {
            this.$().width(this.$().width());
            this.$().height(this.$().height());
        } else {
            this.$().width('');
            this.$().height('');
        }
    }),

    willDestroy: function () {
        Ember.run.cancel(this.get('showSpinnerTimeout'));
    }
});
