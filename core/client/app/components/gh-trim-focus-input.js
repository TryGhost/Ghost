import Ember from 'ember';
/*global device*/
var TrimFocusInput = Ember.TextField.extend({
    focus: true,

    attributeBindings: ['autofocus'],

    autofocus: Ember.computed(function () {
        if (this.get('focus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    focusField: Ember.on('didInsertElement', function () {
        // This fix is required until Mobile Safari has reliable
        // autofocus, select() or focus() support
        if (this.get('focus') && !device.ios()) {
            this.$().val(this.$().val()).focus();
        }
    }),

    trimValue: Ember.on('focusOut', function () {
        var text = this.$().val();
        this.$().val(text.trim());
    })
});

export default TrimFocusInput;
