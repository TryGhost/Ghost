import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import getScrollParent from '../utils/get-scroll-parent';
import relativeToAbsolute from '../lib/relative-to-absolute';
import {TOOLBAR_MARGIN} from './koenig-toolbar';
import {action, computed} from '@ember/object';
import {attributeBindings, classNames} from '@ember-decorators/component';
import {getLinkMarkupFromRange} from '../utils/markup-utils';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

// pixels that should be added to the `left` property of the tick adjustment styles
// TODO: handle via CSS?
const TICK_ADJUSTMENT = 8;

@classic
@attributeBindings('style')
@classNames('kg-input-bar', 'absolute', 'z-999')
export default class KoenigLinkInput extends Component {
    @service config;

    // public attrs
    editor = null;
    linkRange = null;
    linkRect = null;
    selectedRange = null;

    // internal properties
    top = null;
    left = null;
    right = null;
    _href = '';

    // private properties
    _selectedRange = null;
    _windowRange = null;
    _onMousedownHandler = null;
    _onMouseupHandler = null;

    // closure actions
    cancel() {}

    /* computed properties -------------------------------------------------- */

    @computed('top', 'left', 'right')
    get style() {
        let position = this.getProperties('top', 'left', 'right');
        let styles = Object.keys(position).map((style) => {
            if (position[style] !== null) {
                return `${style}: ${position[style]}px`;
            }
        });

        return htmlSafe(styles.compact().join('; '));
    }

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        super.init(...arguments);

        if (!this.source) {
            // record the range now because the property is bound and will update
            // as we make changes whilst calculating the link position
            this._selectedRange = this.selectedRange;
            this._linkRange = this.linkRange;

            // grab a window range so that we can use getBoundingClientRect. Using
            // document.createRange is more efficient than doing editor.setRange
            // because it doesn't trigger all of the selection changing side-effects
            // TODO: extract MobiledocRange->NativeRange into a util
            let editor = this.editor;
            let cursor = editor.cursor;
            let {head, tail} = this._linkRange;
            let {node: headNode, offset: headOffset} = cursor._findNodeForPosition(head);
            let {node: tailNode, offset: tailOffset} = cursor._findNodeForPosition(tail);
            let range = document.createRange();
            range.setStart(headNode, headOffset);
            range.setEnd(tailNode, tailOffset);
            this._windowRange = range;

            // grab an existing href value if there is one
            this._getHrefFromMarkup();
        }

        // wait until rendered to position so that we have access to this.element
        run.schedule('afterRender', this, function () {
            this._positionToolbar();
            this._focusInput();
        });

        // watch the window for mousedown events so that we can close the menu
        // when we detect a click outside
        this._onMousedownHandler = run.bind(this, this._handleMousedown);
        window.addEventListener('mousedown', this._onMousedownHandler);

        // watch for keydown events so that we can close the menu on Escape
        this._onKeydownHandler = run.bind(this, this._handleKeydown);
        window.addEventListener('keydown', this._onKeydownHandler);
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        if (this.source === 'direct' && this.href !== this._href) {
            this.set('_href', this.href);
        }
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this._removeStyleElement();
        window.removeEventListener('mousedown', this._onMousedownHandler);
        window.removeEventListener('keydown', this._onKeydownHandler);
    }

    @action
    inputKeydown(event) {
        if (event.key === 'Enter') {
            // prevent Enter from triggering in the editor and removing text
            event.preventDefault();

            let href = relativeToAbsolute(this._href, this.config.get('blogUrl'));
            this.set('_href', href);

            if (this.source === 'direct') {
                this.update(href);
                this.cancel();
                return;
            }

            // create a single editor runloop here so that we don't get
            // separate remove and replace ops pushed onto the undo stack
            this.editor.run((postEditor) => {
                if (href) {
                    this._replaceLink(href, postEditor);
                } else {
                    this._removeLinks(postEditor);
                }
            });

            this._cancelAndReselect();
        }
    }

    @action
    clear() {
        this.set('_href', '');
        this._focusInput();
    }

    // if we have a single link or a slice of a single link selected, grab the
    // href and adjust our linkRange to encompass the whole link
    _getHrefFromMarkup() {
        let linkMarkup = getLinkMarkupFromRange(this._linkRange);
        if (linkMarkup) {
            this.set('_href', linkMarkup.attributes.href);
            this._linkRange = this._linkRange.expandByMarker(marker => !!marker.markups.includes(linkMarkup));
        }
    }

    _replaceLink(href, postEditor) {
        this._removeLinks(postEditor);
        let linkMarkup = postEditor.builder.createMarkup('a', {href});
        postEditor.toggleMarkup(linkMarkup, this._linkRange);
    }

    // loop over all markers that are touched by linkRange, removing any 'a'
    // markups on them to clear all links
    _removeLinks(postEditor) {
        let {headMarker, tailMarker} = this.linkRange;
        let curMarker = headMarker;

        while (curMarker && curMarker !== tailMarker.next) {
            curMarker.markups.filterBy('tagName', 'a').forEach((markup) => {
                curMarker.removeMarkup(markup);
                postEditor._markDirty(curMarker);
            });
            curMarker = curMarker.next;
        }
    }

    _cancelAndReselect() {
        this.cancel();
        if (this._selectedRange) {
            this.editor.selectRange(this._selectedRange);
        }
    }

    _focusInput() {
        let scrollParent = getScrollParent(this.element);
        let scrollTop = scrollParent.scrollTop;

        this.element.querySelector('input').focus();

        // reset the scroll position to avoid jumps
        // TODO: why does the input focus cause a scroll to the bottom of the doc?
        scrollParent.scrollTop = scrollTop;
    }

    // TODO: largely shared with {{koenig-toolbar}} and {{koenig-snippet-input}} - extract to a shared util?
    _positionToolbar() {
        let containerRect = this.element.offsetParent.getBoundingClientRect();
        let rangeRect = this.linkRect || this._windowRange.getBoundingClientRect();
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
            this._addStyleElement(`left: calc(${tickPosition}% - ${TICK_ADJUSTMENT}px)`);
        }

        // update the toolbar position
        this.setProperties(newPosition);
    }

    _addStyleElement(styles) {
        let styleElement = document.createElement('style');
        styleElement.id = `${this.elementId}-style`;
        styleElement.innerHTML = `#${this.elementId}:before, #${this.elementId}:after { ${styles} }`;
        document.head.appendChild(styleElement);
    }

    _removeStyleElement() {
        let styleElement = document.querySelector(`#${this.elementId}-style`);
        if (styleElement) {
            styleElement.remove();
        }
    }

    _handleMousedown(event) {
        if (!event.target.closest(`#${this.elementId}`)) {
            // no need to re-select for mouse clicks
            this.cancel();
        }
    }

    _handleKeydown(event) {
        if (event.key === 'Escape') {
            this._cancelAndReselect();
        }
    }
}
