import Component from '@glimmer/component';
import SelectionList from './posts-list/selection-list';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhContextMenu extends Component {
    @service dropdown;
    @service modals;

    @tracked isOpen = false;
    @tracked left = 0;
    @tracked top = 0;
    @tracked yPlacement = 'bottom';
    @tracked xPlacement = 'right';
    @tracked selectionList = new SelectionList();
    element = null;

    /**
     * The current state of the context menu
     * @type {'default'|'open'|'modal'|'loading'}
     * default: default state
     * open: menu open
     * modal: modal open
     * loading: performing an action
     */
    state = 'default';

    #originalConfirm = null;
    #modal = null;

    setState(state) {
        switch (state) {
        case this.state:
            return;
        case 'default':
            this.isOpen = false;
            this.#closeModal();
            this.selectionList.unfreeze();
            this.state = state;
            return;
        case 'open':
            if (this.state !== 'default') {
                return;
            }
            this.isOpen = true;
            this.selectionList.freeze();
            this.#closeModal();
            this.state = state;
            return;
        case 'modal':
            if (this.state !== 'open') {
                return;
            }
            this.isOpen = false;
            this.selectionList.freeze();
            this.state = state;
            return;
        case 'loading':
            if (this.state !== 'open' && this.state !== 'modal') {
                return;
            }
            this.isOpen = false;
            this.selectionList.freeze();
            this.state = state;
            return;
        }
    }

    get name() {
        return this.args.name;
    }

    get style() {
        return `left: ${this.left}px; top: ${this.top}px;`;
    }

    get class() {
        return `gh-placement-${this.yPlacement} gh-placement-${this.xPlacement}`;
    }

    @action
    setup(element) {
        this.element = element;
        const dropdownService = this.dropdown;
        dropdownService.on('close', this, this.close);
        dropdownService.on('toggle', this, this.toggle);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.element = null;
        const dropdownService = this.dropdown;
        dropdownService.off('close', this, this.close);
        dropdownService.off('toggle', this, this.toggle);
    }

    @action
    open() {
        this.setState('open');
    }

    @action
    close() {
        if (this.state === 'open') {
            this.setState('default');
        }
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

            this.calculatePlacement();
            this.open();
        } else {
            this.close();
        }
    }

    get listElement() {
        return this.element?.firstElementChild?.firstElementChild;
    }

    calculatePlacement() {
        if (!this.element || !this.listElement) {
            return;
        }

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const menuHeight = this.listElement.offsetHeight;
        const menuWidth = this.listElement.offsetWidth;
        const padding = 10;

        // Do we have enough place to place the menu below?
        if (this.top + menuHeight + padding < windowHeight) {
            this.yPlacement = 'bottom';
        } else {
            this.yPlacement = 'top';
        }

        // Do we have enough place to place the menu to the right?
        if (this.left + menuWidth + padding < windowWidth) {
            this.xPlacement = 'right';
        } else {
            this.xPlacement = 'left';
        }
    }

    @action
    stopClicks(event) {
        event.stopPropagation();
    }

    @task
    *confirmWrapperTask(...args) {
        this.setState('loading');
        let result = yield this.#originalConfirm.perform(...args);
        this.#originalConfirm = null;
        this.setState('default');
        return result;
    }

    openModal(Modal, data) {
        this.#originalConfirm = data.confirm;
        data.confirm = this.confirmWrapperTask;

        this.setState('modal');

        this.#modal = this.modals.open(Modal, data);
        this.#modal.then(() => {
            // We need to delay a little bit for the click event to be processed
            // Since the click event is bubbling back to window, where it will trigger a list deselect
            setTimeout(() => {
                this.setState('default');
            }, 10);
        });
    }

    #closeModal() {
        this.#modal?.close();
        this.#modal = null;
    }

    async performTask(taskObj) {
        this.setState('loading');
        await taskObj.perform();
        this.setState('default');
    }
}
