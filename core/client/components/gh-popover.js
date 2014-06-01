import PopoverMixin from 'ghost/mixins/popover-mixin';

var GhostPopover = Ember.Component.extend(PopoverMixin, {
    classNames: 'ghost-popover fade-in',
    classNameBindings: ['open'],
    name: null,
    closeOnClick: false,
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
    },
    click: function (event) {
        this._super(event);
        if (this.get('closeOnClick')) {
            return this.close();
        }
    },
    close: function () {
        return this.set('open', false);
    },
    toggle: function (options) {
        /*
        Close all popovers whose button was not clicked,
        and toggle the actual target.
        */
        var targetPopoverName = options.target;
        if (this.get('name') === targetPopoverName) {
            this.toggleProperty('open');
        } else {
            this.close();
        }
    }
});

export default GhostPopover;