// adapted from draggable.js Scrollable plugin (MIT)
// https://github.com/Shopify/draggable/blob/master/src/Draggable/Plugins/Scrollable/Scrollable.js
import {
    getDocumentScrollingElement,
    getParentScrollableElement
} from './utils';

export const defaultOptions = {
    speed: 8,
    sensitivity: 50
};

export default class ScrollHandler {
    constructor() {
        this.options = Object.assign({}, defaultOptions);

        this.currentMousePosition = null;
        this.findScrollableElementFrame = null;
        this.scrollableElement = null;
        this.scrollAnimationFrame = null;

        // bind `this` so methods can be passed to requestAnimationFrame
        this._scroll = this._scroll.bind(this);

        // cache browser info to avoid parsing on every animation frame
        this._isSafari = navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1;
    }

    dragStart(draggableInfo) {
        this.findScrollableElementFrame = requestAnimationFrame(() => {
            this.scrollableElement = this.getScrollableElement(draggableInfo.element);
        });
    }

    dragMove(draggableInfo) {
        this.findScrollableElementFrame = requestAnimationFrame(() => {
            this.scrollableElement = this.getScrollableElement(draggableInfo.target);
        });

        if (!this.scrollableElement) {
            return;
        }

        this.currentMousePosition = {
            clientX: draggableInfo.mousePosition.x,
            clientY: draggableInfo.mousePosition.y
        };

        this.scrollAnimationFrame = requestAnimationFrame(this._scroll);
    }

    dragStop() {
        cancelAnimationFrame(this.scrollAnimationFrame);
        cancelAnimationFrame(this.findScrollableElementFrame);

        this.currentMousePosition = null;
        this.findScrollableElementFrame = null;
        this.scrollableElement = null;
        this.scrollAnimationFrame = null;
    }

    getScrollableElement(target) {
        let scrollableElement = getParentScrollableElement(target);

        // workaround for our particular scrolling setup
        // TODO: find a way to make this configurable
        if (scrollableElement === getDocumentScrollingElement()) {
            scrollableElement = document.querySelector('.gh-koenig-editor');
        }

        return scrollableElement;
    }

    _scroll() {
        if (!this.scrollableElement || !this.currentMousePosition) {
            return;
        }

        cancelAnimationFrame(this.scrollAnimationFrame);

        let {speed, sensitivity} = this.options;

        let rect = this.scrollableElement.getBoundingClientRect();

        let scrollableElement = this.scrollableElement;
        let clientX = this.currentMousePosition.clientX;
        let clientY = this.currentMousePosition.clientY;

        let {offsetHeight, offsetWidth} = scrollableElement;

        let topPosition = rect.top + offsetHeight - clientY;
        let bottomPosition = clientY - rect.top;

        // Safari will automatically scroll when the mouse is outside of the window
        // so we want to avoid our own scrolling in that situation to avoid jank
        if (topPosition < sensitivity && !(this._isSafari && topPosition < 0)) {
            scrollableElement.scrollTop += speed;
        } else if (bottomPosition < sensitivity && !(this._isSafari && bottomPosition < 0)) {
            scrollableElement.scrollTop -= speed;
        }

        if (rect.left + offsetWidth - clientX < sensitivity) {
            scrollableElement.scrollLeft += speed;
        } else if (clientX - rect.left < sensitivity) {
            scrollableElement.scrollLeft -= speed;
        }

        this.scrollAnimationFrame = requestAnimationFrame(this._scroll);
    }
}
