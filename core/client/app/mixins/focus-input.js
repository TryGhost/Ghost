/* global device */
import Ember from 'ember';

const {computed} = Ember;

export default Ember.Mixin.create({
    focus: true,
    classNames: 'gh-input',
    attributeBindings: ['autofocus'],

    autofocus: computed(function () {
        if (this.get('focus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    didInsertElement() {
        // This fix is required until Mobile Safari has reliable
        // autofocus, select() or focus() support
        if (this.get('focus') && !device.ios()) {
            this.$().val(this.$().val()).focus();
        }

        this._super(...arguments);
    }
});
