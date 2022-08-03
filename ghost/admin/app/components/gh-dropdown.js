import Component from '@ember/component';
import DropdownMixin from 'ghost-admin/mixins/dropdown-mixin';
import classic from 'ember-classic-decorator';
import {classNameBindings, classNames} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

@classic
@classNames('dropdown')
@classNameBindings('fadeIn:fade-in-scale:fade-out', 'isOpen:open:closed')
export default class GhDropdown extends Component.extend(DropdownMixin) {
    @service dropdown;

    name = null;
    closeOnClick = false;

    // Helps track the user re-opening the menu while it's fading out.
    closing = false;

    // Helps track whether the dropdown is open or closes, or in a transition to either
    isOpen = false;

    onClose() {}

    // Managed the toggle between the fade-in and fade-out classes
    @computed('isOpen', 'closing')
    get fadeIn() {
        return this.isOpen && !this.closing;
    }

    didInsertElement() {
        super.didInsertElement(...arguments);

        let dropdownService = this.dropdown;
        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);

        this._animationEndHandler = run.bind(this, function (event) {
            if (event.animationName === 'fade-out' && this.closing) {
                this.set('isOpen', false);
                this.set('closing', false);
                this.onClose?.();
            }
        });

        this.element.addEventListener('animationend', this._animationEndHandler);
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);

        let dropdownService = this.dropdown;
        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);

        this.element.removeEventListener('animationend', this._animationEndHandler);
    }

    open() {
        this.set('isOpen', true);
        this.set('closing', false);
        this.set('button.isOpen', true);
    }

    close() {
        this.set('closing', true);
        if (this.button) {
            this.set('button.isOpen', false);
        }
    }

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
    }

    click() {
        super.click(...arguments);

        if (this.closeOnClick) {
            return this.close();
        }
    }
}
