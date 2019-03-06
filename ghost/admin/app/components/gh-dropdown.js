import Component from '@ember/component';
import DropdownMixin from 'ghost-admin/mixins/dropdown-mixin';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend(DropdownMixin, {
    dropdown: service(),

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
        return this.isOpen && !this.closing;
    }),

    didInsertElement() {
        let dropdownService = this.dropdown;

        this._super(...arguments);

        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);
    },

    willDestroyElement() {
        let dropdownService = this.dropdown;

        this._super(...arguments);

        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);
    },

    open() {
        this.set('isOpen', true);
        this.set('closing', false);
        this.set('button.isOpen', true);
    },

    close() {
        this.set('closing', true);

        if (this.button) {
            this.set('button.isOpen', false);
        }

        this.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', (event) => {
            if (event.originalEvent.animationName === 'fade-out') {
                run(this, function () {
                    if (this.closing) {
                        this.set('isOpen', false);
                        this.set('closing', false);
                    }
                });
            }
        });
    },

    // Called by the dropdown service when any dropdown button is clicked.
    toggle(options) {
        let isClosing = this.closing;
        let isOpen = this.isOpen;
        let name = this.name;
        let targetDropdownName = options.target;
        let button = this.button;

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

        if (this.closeOnClick) {
            return this.close();
        }
    }
});
