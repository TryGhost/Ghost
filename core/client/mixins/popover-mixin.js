/*
  Popovers and their buttons are evented and do not propagate clicks.
*/
var PopoverMixin = Ember.Mixin.create(Ember.Evented, {
    classNameBindings: ['isOpen:open'],
    isOpen: false,
    click: function (event) {
        this._super(event);
        return event.stopPropagation();
    }
});

export default PopoverMixin;