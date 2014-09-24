import PopoverMixin from 'ghost/mixins/popover-mixin';

var GhostPopover = Ember.Component.extend(PopoverMixin, {
    classNames: 'ghost-popover',
    name: null,
    closeOnClick: false,
    //Helps track the user re-opening the menu while it's fading out.
    closing: false,
    //Helps track whether the popover is open or closes, or in a transition to either
    isOpen: false,
    //Managed the toggle between the fade-in and fade-out classes
    fadeIn: Ember.computed('isOpen', 'closing', function () {
        return this.get('isOpen') && !this.get('closing');
    }),

    classNameBindings: ['fadeIn:fade-in-scale:fade-out', 'isOpen:open:closed'],

    open: function () {
        this.set('isOpen', true);
        this.set('closing', false);
        this.set('button.isOpen', true);
    },
    close: function () {
        var self = this;
        this.set('closing', true);
        if (this.get('button')) {
            this.set('button.isOpen', false);
        }
        this.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
            if (event.originalEvent.animationName === 'fade-out') {
                if (self.get('closing')) {
                    self.set('isOpen', false);
                    self.set('closing', false);
                }
            }
        });
    },
    //Called by the popover service when any popover button is clicked.
    toggle: function (options) {
        var isClosing = this.get('closing'),
            isOpen = this.get('isOpen'),
            name = this.get('name'),
            button = this.get('button'),
            targetPopoverName = options.target;
        
        if (name === targetPopoverName && (!isOpen || isClosing)) {
            if (!button) {
                button = options.button;
                this.set('button', button);
            }
            this.open();
        } else if (isOpen) {
            this.close();
        }
    },

    click: function (event) {
        this._super(event);
        if (this.get('closeOnClick')) {
            return this.close();
        }
    },

    didInsertElement: function () {
        this._super();
        var popoverService = this.get('popover');

        popoverService.on('close', this, this.close);
        popoverService.on('toggle', this, this.toggle);
    },
    willDestroyElement: function () {
        this._super();
        var popoverService = this.get('popover');

        popoverService.off('close', this, this.close);
        popoverService.off('toggle', this, this.toggle);
    }
});

export default GhostPopover;