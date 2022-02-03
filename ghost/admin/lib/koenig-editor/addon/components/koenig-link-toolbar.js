import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import relativeToAbsolute from '../lib/relative-to-absolute';
import {action, computed} from '@ember/object';
import {attributeBindings, classNames} from '@ember-decorators/component';
import {getEventTargetMatchingTag} from 'mobiledoc-kit/utils/element-utils';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

// gap between link and toolbar bottom
const TOOLBAR_MARGIN = 8;
// extra padding to reduce the likelyhood of unexpected hiding
// TODO: improve behaviour with a mouseout timeout or creating a bounding box
// and watching mousemove
const TOOLBAR_PADDING = 12;

// ms to wait before showing the tooltip
const DELAY = 120;

@classic
@attributeBindings('style')
@classNames('absolute', 'z-999')
export default class KoenigLinkToolbar extends Component {
    @service config;

    // public attrs
    container = null;
    editor = null;
    linkRange = null;
    selectedRange = null;

    // internal attrs
    url = 'http://example.com';
    showToolbar = false;
    top = null;
    left = -1000;
    right = null;

    // private attrs
    _canShowToolbar = true;
    _eventListeners = null;

    // closure actions
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
            // add margin-bottom so that there's no gap between the link and
            // the toolbar to avoid closing when mouse moves between elements
            styles.push(`padding-bottom: ${TOOLBAR_PADDING}px`);
        } else {
            styles.push('pointer-events: none !important');
        }

        return htmlSafe(styles.compact().join('; '));
    }

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        super.init(...arguments);
        this._eventListeners = [];
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        // don't show popups if link edit or formatting toolbar is shown
        // TODO: have a service for managing UI state?
        if (this.linkRange || (this.selectedRange && !this.selectedRange.isCollapsed)) {
            this._cancelTimeouts();
            this.set('showToolbar', false);
            this._canShowToolbar = false;
        } else {
            this._canShowToolbar = true;
        }
    }

    didInsertElement() {
        super.didInsertElement(...arguments);

        let container = this.container;
        container.dataset.kgHasLinkToolbar = true;
        this._addEventListener(container, 'mouseover', this._handleMouseover);
        this._addEventListener(container, 'mouseout', this._handleMouseout);
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this._removeAllEventListeners();
    }

    @action
    edit() {
        // get range that covers link
        let linkRange = this._getLinkRange();
        this.editLink(linkRange, this._targetRect);
    }

    @action
    remove() {
        let editor = this.editor;
        let linkRange = this._getLinkRange();
        let editorRange = editor.range;
        editor.run((postEditor) => {
            postEditor.toggleMarkup('a', linkRange);
        });
        this.set('showToolbar', false);
        editor.selectRange(editorRange);
    }

    /* private methods ------------------------------------------------------ */

    _getLinkRange() {
        if (!this._target) {
            return;
        }

        let editor = this.editor;
        let x = this._targetRect.x + this._targetRect.width / 2;
        let y = this._targetRect.y + this._targetRect.height / 2;
        let position = editor.positionAtPoint(x, y);
        let linkMarkup = position.marker && position.marker.markups.findBy('tagName', 'a');
        if (linkMarkup) {
            let linkRange = position.toRange().expandByMarker(marker => !!marker.markups.includes(linkMarkup));
            return linkRange;
        }
    }

    _handleMouseover(event) {
        if (this._canShowToolbar) {
            let target = getEventTargetMatchingTag('a', event.target, this.container);
            if (target && target.isContentEditable && target.closest('[data-kg-has-link-toolbar=true]') === this.container) {
                this._timeout = run.later(this, function () {
                    this._showToolbar(target, {x: event.clientX, y: event.clientY});
                }, DELAY);
            }
        }
    }

    _handleMouseout(event) {
        this._cancelTimeouts();

        if (this.showToolbar) {
            let toElement = event.toElement || event.relatedTarget;
            if (toElement && !(toElement === this.element || toElement === this._target || toElement.closest(`#${this.elementId}`))) {
                this.set('showToolbar', false);
            }
        }
    }

    _showToolbar(target, mousePos) {
        // extract the href attribute value and convert it to absolute based
        // on the configured blog url
        this._target = target;
        let href = target.getAttribute('href');
        let blogUrl = this.config.get('blogUrl');
        this.set('url', relativeToAbsolute(href, blogUrl));
        this.set('showToolbar', true);
        run.schedule('afterRender', this, function () {
            this._positionToolbar(target, mousePos);
        });
    }

    _cancelTimeouts() {
        run.cancel(this._timeout);
        if (this._elementObserver) {
            this._elementObserver.cancel();
        }
    }

    _positionToolbar(target, {x, y}) {
        let containerRect = this.element.offsetParent.getBoundingClientRect();

        // wrapped links can have multiple rects, find one closest to the pointer
        // if we have a pointer position
        if (x && y) {
            let rects = Array.prototype.slice.call(target.getClientRects());
            this._targetRect = rects.find((rect) => {
                return rect.x - TOOLBAR_MARGIN <= x && x <= rect.x + rect.width + TOOLBAR_MARGIN &&
                       rect.y - TOOLBAR_MARGIN <= y && y <= rect.y + rect.height + TOOLBAR_MARGIN;
            });
        }
        if (!this._targetRect) {
            this._targetRect = target.getBoundingClientRect();
        }

        let {width, height} = this.element.getBoundingClientRect();
        let newPosition = {};

        // targetRect is relative to the viewport so we need to subtract the
        // container measurements to get a position relative to the container
        newPosition = {
            top: this._targetRect.top - containerRect.top - height - TOOLBAR_MARGIN + TOOLBAR_PADDING,
            left: this._targetRect.left - containerRect.left + this._targetRect.width / 2 - width / 2,
            right: null
        };

        // don't overflow left boundary
        if (newPosition.left < 0) {
            newPosition.left = 0;
        }
        // same for right boundary
        if (newPosition.left + width > containerRect.width) {
            newPosition.left = null;
            newPosition.right = 0;
        }

        // update the toolbar position
        this.setProperties(newPosition);
    }

    _addStyleElement(styles) {
        let styleElement = document.createElement('style');
        styleElement.id = `${this.elementId}-style`;
        styleElement.innerHTML = `#${this.elementId} > ul:after { ${styles} }`;
        document.head.appendChild(styleElement);
    }

    _removeStyleElement() {
        let styleElement = document.querySelector(`#${this.elementId}-style`);
        if (styleElement) {
            styleElement.remove();
        }
    }

    _addEventListener(element, type, listener) {
        let boundListener = run.bind(this, listener);
        element.addEventListener(type, boundListener);
        this._eventListeners.push([element, type, boundListener]);
    }

    _removeAllEventListeners() {
        this._eventListeners.forEach(([element, type, listener]) => {
            element.removeEventListener(type, listener);
        });
    }
}
