// adapted from draggable.js Scrollable plugin (MIT)
// https://github.com/Shopify/draggable/blob/master/src/Draggable/Plugins/Scrollable/Scrollable.js
import {
    getDocumentScrollingElement,
    getParentScrollableElement
} from './draggable-utils';
import type {ComponentType} from 'react';

// the partial info produced by a container's `getDraggableInfo` callback before
// the handler merges in the live `element`/`mousePosition` to form a DraggableInfo
export interface DraggableInfoSeed {
    type?: string;
    cardName?: string;
    nodeKey?: string;
    dataset?: Record<string, unknown>;
    Icon?: ComponentType<{className?: string}>;
}

export interface DraggableInfo extends DraggableInfoSeed {
    element: HTMLElement;
    mousePosition: {x: number; y: number};
    target?: Element | null;
    insertIndex?: number;
}

export const defaultOptions = {
    speed: 8,
    sensitivity: 50
};

export class ScrollHandler {
    options: {speed: number; sensitivity: number};
    currentMousePosition: {clientX: number; clientY: number} | null;
    findScrollableElementFrame: number | null;
    scrollableElement: Element | null;
    scrollAnimationFrame: number | null;
    private _isSafari: boolean;

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

    dragStart(draggableInfo: DraggableInfo): void {
        this.findScrollableElementFrame = requestAnimationFrame(() => {
            this.scrollableElement = getParentScrollableElement(draggableInfo.element);
        });
    }

    dragMove(draggableInfo: DraggableInfo): void {
        this.findScrollableElementFrame = requestAnimationFrame(() => {
            this.scrollableElement = getParentScrollableElement(draggableInfo.target as Element | null);
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

    dragStop(): void {
        cancelAnimationFrame(this.scrollAnimationFrame!);
        cancelAnimationFrame(this.findScrollableElementFrame!);

        this.currentMousePosition = null;
        this.findScrollableElementFrame = null;
        this.scrollableElement = null;
        this.scrollAnimationFrame = null;
    }

    getScrollableElement(target: Element | null): Element | null {
        let scrollableElement = getParentScrollableElement(target);

        // workaround for our particular scrolling setup
        // TODO: find a way to make this configurable
        if (scrollableElement === getDocumentScrollingElement()) {
            // TODO: will only work inside Admin
            scrollableElement = document.querySelector('.gh-koenig-editor');
        }

        return scrollableElement;
    }

    _scroll(): void {
        if (!this.scrollableElement || !this.currentMousePosition) {
            return;
        }

        cancelAnimationFrame(this.scrollAnimationFrame!);

        const {speed, sensitivity} = this.options;

        const rect = this.scrollableElement.getBoundingClientRect();

        const scrollableElement = this.scrollableElement;
        const clientX = this.currentMousePosition.clientX;
        const clientY = this.currentMousePosition.clientY;

        const {offsetHeight, offsetWidth} = scrollableElement as HTMLElement;

        const topPosition = rect.top + offsetHeight - clientY;
        const bottomPosition = clientY - rect.top;

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
