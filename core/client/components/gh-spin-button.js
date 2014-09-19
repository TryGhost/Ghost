var SpinButton = Ember.Component.extend({
    tagName: 'button',
    type: 'submit',
    buttonText: 'Save',

    // Disable Button when isLoading equals true
    attributeBindings: ['disabled'],

    // Must be set on the controller
    disabled: Ember.computed.equal('submitting', true),

    click: function() {
        this.sendAction('action');

        return false;
    }
});

export default SpinButton;