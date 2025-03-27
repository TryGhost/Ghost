import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

function clearTextSelection() {
    if (window.getSelection) {
        if (window.getSelection().empty) {
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {
            window.getSelection().removeAllRanges();
        }
    }
}

export default class ItemComponent extends Component {
    @service dropdown;

    get selectionList() {
        return this.args.model;
    }

    get id() {
        return this.args.id;
    }

    get isSelected() {
        return this.selectionList.isSelected(this.id);
    }

    /**
     * We use the mouse down event because it allows us to cancel any text selection using preventDefault
     */
    @action
    onMouseDown(event) {
        if (!this.selectionList.enabled) {
            return;
        }

        // If event target has data-ignore-select or one of its partens, then ignore the event
        if (event.target.closest('[data-ignore-select]')) {
            return;
        }

        const shiftKey = event.shiftKey;
        const ctrlKey = event.ctrlKey || event.metaKey;

        if (ctrlKey) {
            this.selectionList.toggleItem(this.id);
            event.preventDefault();
            event.stopPropagation();
            clearTextSelection();
        } else if (shiftKey) {
            try {
                this.selectionList.shiftItem(this.id);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
            event.preventDefault();
            event.stopPropagation();
            clearTextSelection();
        }
    }

    @action
    onClick(event) {
        if (!this.selectionList.enabled) {
            return;
        }

        // If event target has data-ignore-select or one of its partens, then ignore the event
        if (event.target.closest('[data-ignore-select]')) {
            return;
        }

        const shiftKey = event.shiftKey;
        const ctrlKey = event.ctrlKey || event.metaKey;

        if (!ctrlKey && !shiftKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        clearTextSelection();
    }

    @action
    onContextMenu(event) {
        if (!this.selectionList.enabled) {
            return;
        }

        // If event target has data-ignore-select or one of its partens, then ignore the event
        if (event.target.closest('[data-ignore-select]')) {
            return;
        }

        let x = event.clientX;
        let y = event.clientY;

        if (this.isSelected) {
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList: this.selectionList});
        } else {
            this.selectionList.clearSelection();
            this.selectionList.toggleItem(this.id);
            this.selectionList.clearOnNextUnfreeze();
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList: this.selectionList});
        }

        event.preventDefault();
        event.stopPropagation();
    }
}
