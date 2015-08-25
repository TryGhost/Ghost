import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'button',
    buttonText: '',
    submitting: false,
    showSpinner: false,
    autoWidth: true,

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled', 'type', 'tabindex'],

    // Must be set on the controller
    disabled: Ember.computed.equal('submitting', true),

    click: function () {
        if (this.get('action')) {
            this.sendAction('action');
            return false;
        }
        return true;
    },

    setSize: Ember.observer('submitting', function () {
        if (this.get('submitting') && this.get('autoWidth')) {
            this.$().width(this.$().width());
            this.$().height(this.$().height());
        } else {
            this.$().width('');
            this.$().height('');
        }
        this.set('showSpinner', this.get('submitting'));
    })
});
