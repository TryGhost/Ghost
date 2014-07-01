import PopoverMixin from 'ghost/mixins/popover-mixin';

var GhostPopover = Ember.Component.extend(PopoverMixin, {
    classNames: 'ghost-popover fade-in',
    classNameBindings: ['isOpen:open'],
    name: null,

    //Don't manipulate isOpen directly! Use open() and close()
    isOpen: false,
    open: function () {
        this.set('closing', false);
        this.set('isOpen', true);
    },

    //Helps us track if the menu was opened again right after
    //  it was closed.
    closing: false,
    close: function () {
        var self = this;
        this.set('closing', true);
        this.$().fadeOut(200, function () {
            //Make sure this wasn't an aborted fadeout by
            //checking `closing`.
            if (self.get('closing')) {
                self.set('isOpen', false);
                self.set('closing', false);
            }
        });
    },
    //Called by the popover service when any popover button is clicked.
    toggle: function (options) {
        var isClosing = this.get('closing'),
            isOpen = this.get('isOpen'),
            name = this.get('name'),
            targetPopoverName = options.target;
        
        if (name === targetPopoverName && (!isOpen || isClosing)) {
            this.open();
        } else if (isOpen) {
            this.close();
        }
    },

    closeOnClick: false,
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
