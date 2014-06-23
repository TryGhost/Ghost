var TrimFocusInput = Ember.TextField.extend({
    setFocus: function () {
        this.$().val(this.$().val()).focus();
    }.on('didInsertElement'),

    focusOut: function () {
        var text = this.$().val();

        this.$().val(text.trim());
    }
});

export default TrimFocusInput;
