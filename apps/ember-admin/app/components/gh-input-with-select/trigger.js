/* global key */
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export default class GhSearchInputTrigger extends Component {
    @service dropdown;

    inputElem = null;

    constructor() {
        super(...arguments);
        this.dropdown.on('close', this, this.closeFromDropdown);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.dropdown.off('close', this, this.closeFromDropdown);
    }

    closeFromDropdown() {
        this.args.select.actions.close();
    }

    @action
    registerInput(elem) {
        this.inputElem = elem;

        if (this.args.extra?.autofocus) {
            this.inputElem.focus();
        }
    }

    @action
    handleInput(event) {
        let term = event.target.value;

        // open dropdown if not open and term is present
        // close dropdown if open and term is blank
        if (isBlank(term) === this.args.select.isOpen) {
            isBlank(term) ? this.close() : this.open();
        }

        this.args.onInput?.(event);
    }

    // hacky workaround to let Escape clear the input if there's text,
    // but still allow it to bubble if there's no text (used for closing modals, etc)
    @action
    handleKeydown(e) {
        if ((e.key === 'Escape' && e.target.value) || e.key === 'Enter') {
            this._previousKeyScope = key.getScope();
            key.setScope('ignore');
        }
    }

    @action
    handleKeyup() {
        if (key.getScope() === 'ignore') {
            key.setScope(this._previousKeyScope);
        }
    }

    @action
    handleFocus() {
        if (this.args.extra?.openOnFocus && this.args.select.results.length > 0) {
            this.open();
        }

        this.args.onFocus?.(...arguments);

        if (this.args.extra.showSearchMessage === false && this.args.select.results.length === 0) {
            this.close();
        }
    }

    @action
    handleBlur(event) {
        if (event?.relatedTarget) {
            const thisInputTrigger = this.inputElem.closest('.ember-basic-dropdown-trigger');
            const relatedInputTrigger = event.relatedTarget.closest('.ember-basic-dropdown-trigger');

            if (relatedInputTrigger !== thisInputTrigger) {
                this.args.select.actions.search('');
                this.close();
            }
        }

        if (this.args.extra?.value && this.args.select.searchText === this.args.extra.value) {
            this.args.select.actions.search('');
            this.close();
        }

        this.args.onBlur?.(...arguments);
    }

    @action
    closeWhenEmpty() {
        if (document.activeElement === this.inputElem) {
            if (this.args.extra?.closeWhenEmpty) {
                if (this.args.select.results.length > 0) {
                    this.open();
                }

                if (this.args.select.results.length === 0) {
                    this.close();
                }
            }
        }
    }

    open() {
        if (!this.args.select.isOpen) {
            // second argument skips ember-basic-dropdown focus
            this.args.select.actions.open(null, true);
        }
    }

    close() {
        if (this.args.select.isOpen) {
            // second argument skips ember-basic-dropdown focus
            this.args.select.actions.close(null, true);
        }
    }
}
