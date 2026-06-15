import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

// A touch long-press is the mobile equivalent of a right-click for opening the
// context menu, since touch devices have no contextmenu gesture of their own.
const LONG_PRESS_DURATION_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD_PX = 10;

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

    longPressTimer = null;
    longPressFired = false;
    touchStartX = 0;
    touchStartY = 0;
    ghostClickHandler = null;
    ghostClickTimer = null;

    get selectionList() {
        return this.args.model;
    }

    get id() {
        return this.args.id;
    }

    get isSelected() {
        return this.selectionList.isSelected(this.id);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.cancelLongPress();
        this.cancelGhostClickSuppression();
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    // A long-press opens the menu while the finger is still down; on release the browser
    // fires a synthetic "ghost" click that the dropdown service's body-click handler reads
    // as an outside click, closing the menu instantly. Swallow that one click at the
    // document level (capture phase, before it reaches the overlay or body).
    suppressGhostClick() {
        this.cancelGhostClickSuppression();
        this.ghostClickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.cancelGhostClickSuppression();
        };
        document.addEventListener('click', this.ghostClickHandler, true);
        this.ghostClickTimer = setTimeout(() => this.cancelGhostClickSuppression(), 500);
    }

    cancelGhostClickSuppression() {
        if (this.ghostClickHandler) {
            document.removeEventListener('click', this.ghostClickHandler, true);
            this.ghostClickHandler = null;
        }
        if (this.ghostClickTimer) {
            clearTimeout(this.ghostClickTimer);
            this.ghostClickTimer = null;
        }
    }

    openContextMenu(x, y) {
        if (this.isSelected) {
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList: this.selectionList});
        } else {
            this.selectionList.clearSelection();
            this.selectionList.toggleItem(this.id);
            this.selectionList.clearOnNextUnfreeze();
            this.dropdown.toggleDropdown('context-menu', this, {left: x, top: y, selectionList: this.selectionList});
        }
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
        // A long-press opens the context menu while the finger is still down; swallow
        // the click that fires on release so the row doesn't also navigate
        if (this.longPressFired) {
            this.longPressFired = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }

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

        // Some touch platforms (e.g. Android) emit a native contextmenu on long-press in
        // addition to our timer. If the long-press already opened the menu, just swallow
        // this event so we don't toggle it straight back closed.
        if (this.longPressFired) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        this.cancelLongPress();

        this.openContextMenu(event.clientX, event.clientY);

        event.preventDefault();
        event.stopPropagation();
    }

    @action
    onTouchStart(event) {
        if (!this.selectionList.enabled) {
            return;
        }

        if (event.target.closest('[data-ignore-select]')) {
            return;
        }

        this.cancelLongPress();
        this.longPressFired = false;

        if (event.touches.length !== 1) {
            return;
        }

        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            this.longPressFired = true;
            this.openContextMenu(this.touchStartX, this.touchStartY);
        }, LONG_PRESS_DURATION_MS);
    }

    @action
    onTouchMove(event) {
        if (!this.longPressTimer) {
            return;
        }

        const touch = event.touches[0];
        if (!touch) {
            return;
        }

        // A press that drifts past the threshold is a scroll, not a long-press
        const dx = Math.abs(touch.clientX - this.touchStartX);
        const dy = Math.abs(touch.clientY - this.touchStartY);
        if (dx > LONG_PRESS_MOVE_THRESHOLD_PX || dy > LONG_PRESS_MOVE_THRESHOLD_PX) {
            this.cancelLongPress();
        }
    }

    @action
    onTouchEnd() {
        this.cancelLongPress();

        // If the long-press opened the menu, the finger lift fires a synthetic ghost click
        // right after this; arm the one-shot suppressor now so that click can't close the menu.
        // Arming here (at release) rather than when the menu opened means it works no matter
        // how long the press was held.
        if (this.longPressFired) {
            this.suppressGhostClick();
        }
    }
}
