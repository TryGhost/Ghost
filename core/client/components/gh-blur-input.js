var BlurInput = Ember.TextField.extend({
    selectOnClick: false,
    click: function (event) {
        if (this.get('selectOnClick')) {
            event.currentTarget.select();
        }
    },
    focusOut: function () {
        this.sendAction('action', this.get('value'));
    }
});

export default BlurInput;
