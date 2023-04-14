import Component from '@glimmer/component';
import SelectionList from '../utils/selection-list';
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
    @tracked selectionList = new SelectionList();

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

            this.open();
        } else {
            this.close();
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
