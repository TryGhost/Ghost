/*
  Popovers and their buttons are evented and do not propagate clicks.
*/
var PopoverMixin = Ember.Mixin.create(Ember.Evented, {
    click: function (event) {
        this._super(event);
        return event.stopPropagation();
    }
});

export default PopoverMixin;