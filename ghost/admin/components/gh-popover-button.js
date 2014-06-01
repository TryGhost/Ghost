import PopoverMixin from 'ghost/mixins/popover-mixin';

var PopoverButton = Ember.Component.extend(PopoverMixin, {
    tagName: 'button',
    /*matches with the popover this button toggles*/
    popoverName: null,
    /*Notify popover service this popover should be toggled*/
    click: function (event) {
        this._super(event);
        this.get('popover').togglePopover(this.get('popoverName'));
    }
});

export default PopoverButton;