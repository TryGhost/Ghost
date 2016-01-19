import Ember from 'ember';
import DropdownMixin from 'ghost/mixins/dropdown-mixin';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend(DropdownMixin, {
    classNames: 'dropdown',
    classNameBindings: ['fadeIn:fade-in-scale:fade-out', 'isOpen:open:closed'],

    name: null,
    closeOnClick: false,

    // Helps track the user re-opening the menu while it's fading out.
    closing: false,

    // Helps track whether the dropdown is open or closes, or in a transition to either
    isOpen: false,

    // Managed the toggle between the fade-in and fade-out classes
    fadeIn: computed('isOpen', 'closing', function () {
        return this.get('isOpen') && !this.get('closing');
    }),

    dropdown: service(),

    open() {
        this.set('isOpen', true);
        this.set('closing', false);
        this.set('button.isOpen', true);
    },

    close() {
        this.set('closing', true);

        if (this.get('button')) {
            this.set('button.isOpen', false);
        }

        this.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', (event) => {
            if (event.originalEvent.animationName === 'fade-out') {
                Ember.run(this, function () {
                    if (this.get('closing')) {
                        this.set('isOpen', false);
                        this.set('closing', false);
                    }
                });
            }
        });
    },

    // Called by the dropdown service when any dropdown button is clicked.
    toggle(options) {
        let isClosing = this.get('closing');
        let isOpen = this.get('isOpen');
        let name = this.get('name');
        let targetDropdownName = options.target;
        let button = this.get('button');

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

    click(event) {
        this._super(event);

        if (this.get('closeOnClick')) {
            return this.close();
        }
    },

    didInsertElement() {
        let dropdownService = this.get('dropdown');

        this._super(...arguments);

        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);
    },

    willDestroyElement() {
        let dropdownService = this.get('dropdown');

        this._super(...arguments);

        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);
    }
});
