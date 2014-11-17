var TrimFocusInput = Ember.TextField.extend({
    focus: true,

    setFocus: function () {
        if (this.get('focus')) {
            this.$().focus();
        }
    }.on('didInsertElement'),

    focusOut: function (event) {
        this._super(event);
        this.set('value', this.get('value').trim());
    }
});

export default TrimFocusInput;
