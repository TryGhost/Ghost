var BlurInput = Ember.TextField.extend({
    selectOnClick: false,
    stopEnterKeyDownPropagation: false,
    click: function (event) {
        if (this.get('selectOnClick')) {
            event.currentTarget.select();
        }
    },
    focusOut: function () {
        this.sendAction('action', this.get('value'));
    },
    keyDown: function (event) {
        // stop event propagation when pressing "enter"
        // most useful in the case when undesired (global) keyboard shortcuts are getting triggered while interacting
        // with this particular input element.
        if (this.get('stopEnterKeyDownPropagation') && event.keyCode === 13) {
            event.stopPropagation();
            return true;
        }
    }
});

export default BlurInput;
