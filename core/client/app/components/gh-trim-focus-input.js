/*global device*/
import Ember from 'ember';

const {TextField, computed} = Ember;

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

    _focusField() {
        // This fix is required until Mobile Safari has reliable
        // autofocus, select() or focus() support
        if (this.get('focus') && !device.ios()) {
            this.$().val(this.$().val()).focus();
        }
    },

    _trimValue() {
        let text = this.$().val();
        this.$().val(text.trim());
    },

    didInsertElement() {
        this._super(...arguments);
        this._focusField();
    },

    focusOut() {
        this._super(...arguments);
        this._trimValue();
    }
});
