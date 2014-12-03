/*global device*/
var TrimFocusInput = Ember.TextField.extend({
    focus: true,

    attributeBindings: ['autofocus'],

    autofocus: Ember.computed(function () {
        return (device.ios()) ? false : 'autofocus';
    }),

    setFocus: function () {
        // This fix is required until Mobile Safari has reliable
        // autofocus, select() or focus() support
        if (this.focus && !device.ios()) {
            this.$().val(this.$().val()).focus();
        }
    }.on('didInsertElement'),

    focusOut: function () {
        var text = this.$().val();

        this.$().val(text.trim());
    }
});

export default TrimFocusInput;
