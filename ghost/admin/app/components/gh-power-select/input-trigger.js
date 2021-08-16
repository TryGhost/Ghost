/* global key */
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';

export default class GhSearchInputTrigger extends Component {
    @action
    registerInput(elem) {
        this.inputElem = elem;
    }

    @action
    captureMousedown(e) {
        e.stopPropagation();
    }

    @action
    search(event) {
        let term = event.target.value;

        // open dropdown if not open and term is present
        // close dropdown if open and term is blank
        if (isBlank(term) === this.args.select.isOpen) {
            isBlank(term) ? this.close() : this.open();

            // ensure focus isn't lost when dropdown is closed
            if (isBlank(term) && this.inputElem) {
                this.inputElem.focus();
            }
        }

        this.args.select.actions.search(term);
    }

    // hacky workaround to let Escape clear the input if there's text,
    // but still allow it to close the search modal if there's no text
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

    open() {
        this.args.select.actions.open();
    }

    close() {
        this.args.select.actions.close();
    }
}
