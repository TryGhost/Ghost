import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {attributeBindings, classNames} from '@ember-decorators/component';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

// initially rendered offscreen with opacity 0 so that sizing is available
// shown when passed in an uncollapsed selected range
// display is delayed until the mouse button is lifted
// positioned so that it's always fully within the editor container
// animation occurs via CSS transitions
// position is kept after hiding, it's made inoperable by CSS pointer-events

// pixels that should be added to separate toolbar from positioning rect
export const TOOLBAR_MARGIN = 15;

// pixels that should be added to the `left` property of the tick adjustment styles
// TODO: handle via CSS?
const TICK_ADJUSTMENT = 8;

@classic
@attributeBindings('style')
@classNames('absolute', 'z-999')
export default class KoenigToolbar extends Component {
    @service feature;

    // public attrs
    basicOnly = false;
    editor = null;
    editorRange = null;
    activeMarkupTagNames = null;
    activeSectionTagNames = null;

    // internal properties
    showToolbar = false;
    top = null;
    left = -1000;
    right = null;

    // private properties
    _isMouseDown = false;
    _hasSelectedRange = false;
    _onMousedownHandler = null;
    _onMousemoveHandler = null;
    _onMouseupHandler = null;
    _onResizeHandler = null;

    // closure actions
    toggleMarkup() {}
    toggleSection() {}
    toggleHeaderSection() {}
    editLink() {}

    /* computed properties -------------------------------------------------- */

    @computed('showToolbar', 'top', 'left', 'right')
    get style() {
        let position = this.getProperties('top', 'left', 'right');
        let styles = Object.keys(position).map((style) => {
            if (position[style] !== null) {
                return `${style}: ${position[style]}px`;
            }
        });

        // ensure hidden toolbar is non-interactive
        if (this.showToolbar) {
            styles.push('pointer-events: auto !important');
        } else {
            styles.push('pointer-events: none !important');
        }

        return htmlSafe(styles.compact().join('; '));
    }

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        super.init(...arguments);

        // track mousedown/mouseup on the window so that we're sure to get the
        // events even when they start outside of this component or end outside
        // the window
        this._onMousedownHandler = run.bind(this, this._handleMousedown);
        window.addEventListener('mousedown', this._onMousedownHandler);
        this._onMouseupHandler = run.bind(this, this._handleMouseup);
        window.addEventListener('mouseup', this._onMouseupHandler);
        this._onResizeHandler = run.bind(this, this._handleResize);
        window.addEventListener('resize', this._onResizeHandler);
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);
        let range = this.editorRange;

        if (range && !range.isCollapsed) {
            this._hasSelectedRange = true;
        } else {
            this._hasSelectedRange = false;
        }

        if ((this._hasSelectedRange && !this.showToolbar) || (!this._hasSelectedRange && this.showToolbar)) {
            this._toggleVisibility.perform();
        }
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this._removeStyleElement();
        run.cancel(this._throttleResize);
        window.removeEventListener('mousedown', this._onMousedownHandler);
        window.removeEventListener('mousemove', this._onMousemoveHandler);
        window.removeEventListener('mouseup', this._onMouseupHandler);
        window.removeEventListener('resize', this._onResizeHandler);
    }

    @action
    _toggleMarkup(markupName, event) {
        event?.preventDefault();

        if (markupName === 'em' && this.activeMarkupTagNames.isI) {
            markupName = 'i';
        }

        this.toggleMarkup(markupName);
    }

    @action
    toggleQuoteSection(event) {
        event?.preventDefault();

        let sectionName = 'blockquote';

        if (this.activeSectionTagNames.isBlockquote) {
            sectionName = 'aside';
        } else if (this.activeSectionTagNames.isAside) {
            sectionName = 'p';
        }

        const range = this.editorRange;
        this.editor.run((postEditor) => {
            this.toggleSection(sectionName, postEditor);
            postEditor.setRange(range);
        });
    }

    @action
    _toggleHeaderSection(headingTagName, event) {
        event?.preventDefault();

        let range = this.editorRange;
        this.editor.run((postEditor) => {
            this.toggleHeaderSection(headingTagName, postEditor, {force: true});
            postEditor.setRange(range);
        });
    }

    @action
    _editLink(event) {
        event?.preventDefault();

        this.editLink(this.editorRange);
    }

    /* private methods ------------------------------------------------------ */

    @(task(function* (skipMousemove = false) {
        // double-taps will often trigger before the selection change event so
        // we want to keep the truthy mousemove skip around so that re-triggers
        // within the 50ms timeout do not reset it
        if (skipMousemove) {
            this._skipMousemove = true;
        }

        // debounce for 50ms to account for "click to deselect" otherwise we
        // run twice and the fade out animation jumps position
        yield timeout(50);

        // return early if the editorRange hasn't changed, this prevents
        // re-rendering unnecessarily which can cause minor position jumps when
        // styles are toggled because getBoundingClientRect on getSelection
        // changes slightly depending on the style of selected text
        if (this._hasSelectedRange && this.editorRange === this._lastRange) {
            return;
        }

        // if we have a range, show the toolbnar once the mouse is lifted
        if (this._hasSelectedRange && !this._isMouseDown) {
            this._showToolbar(this._skipMousemove);
        } else {
            this._hideToolbar();
        }

        this._skipMousemove = false;
    }).restartable())
        _toggleVisibility;

    _handleMousedown(event) {
        // we only care about the left mouse button
        if (event.which === 1) {
            this._isMouseDown = true;
            // prevent mousedown on toolbar buttons losing editor focus before the following click event can trigger the buttons behaviour
            if (this.element.contains(event.target)) {
                event.preventDefault();
            }
        }
    }

    _handleMousemove() {
        if (this._hasSelectedRange && !this.showToolbar) {
            this.set('showToolbar', true);
        }

        this._removeMousemoveHandler();
    }

    _removeMousemoveHandler() {
        window.removeEventListener('mousemove', this._onMousemoveHandler);
        this._onMousemoveHandler = null;
    }

    _handleMouseup(event) {
        if (event.which === 1) {
            this._isMouseDown = false;
            // we want to skip the mousemove handler here because we know the
            // selection (if there was one) was via the mouse and we don't want
            // to wait for another mousemove before showing the toolbar
            this._toggleVisibility.perform(true);
        }
    }

    _handleResize() {
        if (this.showToolbar) {
            this._throttleResize = run.throttle(this, this._positionToolbar, 100);
        }
    }

    _showToolbar(skipMousemove) {
        this._positionToolbar();

        if (skipMousemove) {
            this.set('showToolbar', true);
        }

        if (!this.showToolbar && !this._onMousemoveHandler) {
            this._onMousemoveHandler = run.bind(this, this._handleMousemove);
            window.addEventListener('mousemove', this._onMousemoveHandler);
        }

        // track displayed range so that we don't re-position unnecessarily
        this._lastRange = this.editorRange;
    }

    _hideToolbar() {
        if (!this.isDestroyed || !this.isDestroying) {
            this.set('showToolbar', false);
        }
        this._lastRange = null;
        this._removeMousemoveHandler();
    }

    _positionToolbar() {
        let containerRect = this.element.offsetParent.getBoundingClientRect();
        let range = window.getSelection().getRangeAt(0);
        let rangeRect = range.getBoundingClientRect();
        let {width, height} = this.element.getBoundingClientRect();
        let newPosition = {};

        // rangeRect is relative to the viewport so we need to subtract the
        // container measurements to get a position relative to the container
        newPosition = {
            top: rangeRect.top - containerRect.top - height - TOOLBAR_MARGIN,
            left: rangeRect.left - containerRect.left + rangeRect.width / 2 - width / 2,
            right: null
        };

        let tickPosition = 50;
        // don't overflow left boundary
        if (newPosition.left < 0) {
            newPosition.left = 0;

            // calculate the tick percentage position
            let absTickPosition = rangeRect.left - containerRect.left + rangeRect.width / 2;
            tickPosition = absTickPosition / width * 100;
            if (tickPosition < 5) {
                tickPosition = 5;
            }
        }
        // same for right boundary
        if (newPosition.left + width > containerRect.width) {
            newPosition.left = null;
            newPosition.right = 0;

            // calculate the tick percentage position
            let absTickPosition = rangeRect.right - containerRect.right - rangeRect.width / 2;
            tickPosition = 100 + absTickPosition / width * 100;
            if (tickPosition > 95) {
                tickPosition = 95;
            }
        }

        // the tick is a pseudo-element so we the only way we can affect it's
        // style is by adding a style element to the head
        this._removeStyleElement(); // reset to base styles
        if (tickPosition !== 50) {
            this._addStyleElement(tickPosition);
        }

        // update the toolbar position
        this.setProperties(newPosition);
    }

    _addStyleElement(tickPosition) {
        let beforeStyle = `left: calc(${tickPosition}% - ${TICK_ADJUSTMENT + 2}px);`;
        let afterStyle = `left: calc(${tickPosition}% - ${TICK_ADJUSTMENT}px);`;
        let styleElement = document.createElement('style');
        styleElement.id = `${this.elementId}-style`;
        styleElement.innerHTML = `
            #${this.elementId} > ul:before { ${beforeStyle} }
            #${this.elementId} > ul:after { ${afterStyle} }
        `;
        document.head.appendChild(styleElement);
    }

    _removeStyleElement() {
        let styleElement = document.querySelector(`#${this.elementId}-style`);
        if (styleElement) {
            styleElement.remove();
        }
    }
}
