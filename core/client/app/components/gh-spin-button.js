import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'button',
    buttonText: '',
    submitting: false,
    autoWidth: true,

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled'],

    // Must be set on the controller
    disabled: Ember.computed.equal('submitting', true),

    click: function () {
        if (this.get('action')) {
            this.sendAction('action');
            return false;
        }
        return true;
    },

    setSize: function () {
        if (!this.get('submitting') && this.get('autoWidth')) {
            // this exists so that the spinner doesn't change the size of the button
            this.$().width(this.$().width()); // sets width of button
            this.$().height(this.$().height()); // sets height of button
        }
    },

    width: Ember.observer('buttonText', 'autoWidth', function () {
        this.setSize();
    }),

    didInsertElement: function () {
        this.setSize();
    }
});
