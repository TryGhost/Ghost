/*global device*/
import Ember from 'ember';

const {TextField, computed, on} = Ember;

export default TextField.extend({
    focus: true,
    classNames: 'gh-input',
    attributeBindings: ['autofocus'],

    autofocus: computed(function () {
        if (this.get('focus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    focusField: on('didInsertElement', function () {
        // This fix is required until Mobile Safari has reliable
        // autofocus, select() or focus() support
        if (this.get('focus') && !device.ios()) {
            this.$().val(this.$().val()).focus();
        }
    }),

    trimValue: on('focusOut', function () {
        let text = this.$().val();
        this.$().val(text.trim());
    })
});
