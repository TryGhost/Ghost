import Component from '@ember/component';
import layout from '../templates/components/koenig-toolbar';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {task, timeout} from 'ember-concurrency';

// initially rendered offscreen with opacity 0 so that sizing is available
// shown when passed in an uncollapsed selected range
// display is delayed until the mouse button is lifted
// positioned so that it's always fully within the editor container
// animation occurs via CSS transitions
// position is kept after hiding, it's made inoperable by CSS pointer-events

const TOOLBAR_TOP_MARGIN = 15;

export default Component.extend({
    layout,

    attributeBindings: ['style'],

    // public attrs
    classNames: ['koenig-toolbar'],
    classNameBindings: ['showToolbar:koenig-toolbar--visible'],
    editorRange: null,

    // internal properties
    showToolbar: false,
    top: null,
    left: -1000,
    right: null,

    // private properties
    _isMouseDown: false,
    _onMousedownHandler: false,
    _onMouseupHandler: false,
    _hasSelectedRange: false,

    /* computed properties -------------------------------------------------- */

    style: computed('top', 'left', 'right', function () {
        let position = this.getProperties('top', 'left', 'right');
        let styles = Object.keys(position).map((style) => {
            if (position[style] !== null) {
                return `${style}: ${position[style]}px`;
            }
        });

        return htmlSafe(styles.compact().join('; '));
    }),

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        this._super(...arguments);

        // track mousedown/mouseup on the window so that we're sure to get the
        // events even when they start outside of this component or end outside
        // the window
        this._onMousedownHandler = (event) => {
            // we only care about the left mouse button
            if (event.which === 1) {
                this._isMouseDown = true;
            }
        };
        this._onMouseupHandler = (event) => {
            if (event.which === 1) {
                this._isMouseDown = false;
                this.get('_toggleVisibility').perform();
            }
        };
        window.addEventListener('mousedown', this._onMousedownHandler);
        window.addEventListener('mouseup', this._onMouseupHandler);
    },

    didReceiveAttrs() {
        this._super(...arguments);
        let range = this.get('editorRange');

        if (range && !range.isCollapsed) {
            this._hasSelectedRange = true;
        } else {
            this._hasSelectedRange = false;
        }

        this.get('_toggleVisibility').perform();
    },

    willDestroyElement() {
        this._super(...arguments);
        this._removeStyleElement();
        window.removeEventListener('mousedown', this._onMousedownHandler);
        window.removeEventListener('mouseup', this._onMouseupHandler);
    },

    _toggleVisibility: task(function* () {
        // debounce for 100ms to account for "click to deselect" otherwise we
        // run twice and the fade out animation jumps position
        yield timeout(50);

        // return early if the editorRange hasn't changed, this prevents
        // re-rendering unnecessarily which can cause minor position jumps when
        // styles are toggled because getBoundingClientRect on getSelection
        // changes slightly depending on the style of selected text
        if (this.get('editorRange') === this._lastRange) {
            return;
        }

        // if we have a range, show the toolbnar once the mouse is lifted
        if (this._hasSelectedRange && !this._isMouseDown) {
            let containerRect = this.element.parentNode.getBoundingClientRect();
            let range = window.getSelection().getRangeAt(0);
            let rangeRect = range.getBoundingClientRect();
            let {width, height} = this.element.getBoundingClientRect();
            let newPosition = {};

            // rangeRect is relative to the viewport so we need to subtract the
            // container measurements to get a position relative to the container
            newPosition = {
                top: rangeRect.top - containerRect.top - height - TOOLBAR_TOP_MARGIN,
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
                this._addStyleElement(`left: ${tickPosition}%`);
            }

            // update the toolbar position and show it
            this.setProperties(newPosition);

            // show the toolbar
            this.set('showToolbar', true);

            // track displayed range so that we don't re-position unnecessarily
            this._lastRange = this.get('editorRange');
        } else {
            // hide the toolbar
            this.set('showToolbar', false);
            this._lastRange = null;
        }
    }).restartable(),

    _addStyleElement(styles) {
        let styleElement = document.createElement('style');
        styleElement.id = `${this.elementId}-style`;
        styleElement.innerHTML = `#${this.elementId}:after { ${styles} }`;
        document.head.appendChild(styleElement);
    },

    _removeStyleElement() {
        let styleElement = document.querySelector(`#${this.elementId}-style`);
        if (styleElement) {
            styleElement.remove();
        }
    }
});
