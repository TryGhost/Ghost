var FocusInput = Ember.TextField.extend({
    becomeFocused: function () {
        this.$().val(this.$().val()).focus();
    }.on('didInsertElement')
});

export default FocusInput;
