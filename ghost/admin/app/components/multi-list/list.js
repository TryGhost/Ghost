import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class ListComponent extends Component {
    @tracked ctrlPressed = false;
    @tracked metaPressed = false;
    @tracked shiftPressed = false;

    get selectionList() {
        return this.args.model;
    }

    /**
     * Required for shift behaviour
     */
    get allIds() {
        return this.args.all.map(a => a.id);
    }

    get actionKeyPressed() {
        return this.ctrlPressed || this.metaPressed || this.shiftPressed;
    }

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('keydown', this.onKeyDow, {passive: true});
        window.removeEventListener('keyup', this.onKeyUp, {passive: true});
        window.removeEventListener('click', this.onWindowClicked, {passive: true});
    }

    @action
    setup() {
        window.addEventListener('keydown', this.onKeyDown, {passive: false});
        window.addEventListener('keyup', this.onKeyUp, {passive: true});
        window.addEventListener('click', this.onWindowClicked, {passive: true});
    }

    @action
    onWindowClicked(event) {
        // Clear selection if no ctrl/meta key is pressed
        if (!event.metaKey && !event.ctrlKey) {
            this.selectionList.clearSelection();
        }
    }

    @action
    onKeyDown(event) {
        if (event.key === 'Control') {
            this.ctrlPressed = true;
        }
        if (event.key === 'Meta') {
            this.metaPressed = true;
        }
        if (event.key === 'Shift') {
            this.shiftPressed = true;
        }

        if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
            if (event.key === 'a') {
                this.selectionList.selectAll();
                event.preventDefault();
                return;
            }
        }

        if (event.key === 'Escape') {
            this.selectionList.clearSelection();
        }
    }

    @action
    onKeyUp(event) {
        if (event.key === 'Control') {
            this.ctrlPressed = false;
        }
        if (event.key === 'Meta') {
            this.metaPressed = false;
        }
        if (event.key === 'Shift') {
            this.shiftPressed = false;
        }
    }
}
