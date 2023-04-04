import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

function clearTextSelection() {
    if (window.getSelection) {
        if (window.getSelection().empty) { // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) { // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if (document.selection) { // IE?
        document.selection.empty();
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

    @action
    onClick(event) {
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
    onContextMenu(event) {
        let x = event.clientX;
        let y = event.clientY;

        if (this.isSelected) {
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList: this.selectionList});
        } else {
            const selectionList = this.selectionList.cloneEmpty();
            selectionList.toggleItem(this.id);
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList});
        }

        event.preventDefault();
        event.stopPropagation();
    }
}
