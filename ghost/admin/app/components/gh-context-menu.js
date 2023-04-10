import Component from '@glimmer/component';
import SelectionList from '../utils/selection-list';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhContextMenu extends Component {
    @service dropdown;

    @tracked isOpen = false;
    @tracked left = 0;
    @tracked top = 0;
    @tracked selectionList = new SelectionList();

    get name() {
        return this.args.name;
    }

    get style() {
        return `left: ${this.left}px; top: ${this.top}px;`;
    }

    @action
    setup() {
        const dropdownService = this.dropdown;
        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        const dropdownService = this.dropdown;
        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    @action
    onContextMenuOutside(event) {
        this.close();
        event.preventDefault();
        event.stopPropagation();
    }

    // Called by the dropdown service when the context menu should open
    @action
    toggle(options) {
        const targetDropdownName = options.target;
        if (this.name === targetDropdownName) {
            if (options.left !== undefined) {
                this.left = options.left;
                this.top = options.top;
            }
            if (options.selectionList) {
                this.selectionList = options.selectionList;
            }

            this.open();
        } else if (this.isOpen) {
            this.close();
        }
    }

    @action
    stopClicks(event) {
        event.stopPropagation();
    }
}
