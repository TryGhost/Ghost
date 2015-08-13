import Ember from 'ember';
import DropdownMixin from 'ghost/mixins/dropdown-mixin';

export default Ember.Component.extend(DropdownMixin, {
    classNames: 'dropdown',
    classNameBindings: ['fadeIn:fade-in-scale:fade-out', 'isOpen:open:closed'],

    name: null,
    closeOnClick: false,

    // Helps track the user re-opening the menu while it's fading out.
    closing: false,

    // Helps track whether the dropdown is open or closes, or in a transition to either
    isOpen: false,

    // Managed the toggle between the fade-in and fade-out classes
    fadeIn: Ember.computed('isOpen', 'closing', function () {
        return this.get('isOpen') && !this.get('closing');
    }),

    dropdown: Ember.inject.service(),

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

    // Called by the dropdown service when any dropdown button is clicked.
    toggle: function (options) {
        var isClosing = this.get('closing'),
            isOpen = this.get('isOpen'),
            name = this.get('name'),
            button = this.get('button'),
            targetDropdownName = options.target;

        if (name === targetDropdownName && (!isOpen || isClosing)) {
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

        var dropdownService = this.get('dropdown');

        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);
    },

    willDestroyElement: function () {
        this._super();

        var dropdownService = this.get('dropdown');

        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);
    }
});
