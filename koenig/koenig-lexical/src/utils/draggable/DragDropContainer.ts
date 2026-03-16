import * as constants from './draggable-constants';
import type {DraggableInfo, DraggableInfoSeed} from './ScrollHandler';

// Container represents an element, inside which are draggables and/or droppables.
//
// Containers handle events triggered by the DragDropReorderPlugin.
// Containers can be nested, the DragDropReorderPlugin will select the closest
// parent container in the DOM heirarchy when triggering events.
//
// Containers accept options which are mostly configuration for how to determine
// contained draggable/droppable elements and functions to call when events are
// processed.

export interface IndicatorPosition {
    direction: 'horizontal' | 'vertical';
    position: string;
    beforeElems: HTMLElement[];
    afterElems: HTMLElement[];
    insertIndex: number;
}

export interface DragDropContainerOptions {
    draggableSelector?: string;
    droppableSelector?: string;
    isDragEnabled?: boolean;
    createGhostElement?: (draggableInfo: DraggableInfo) => Node | undefined;
    getDraggableInfo?: (draggableElement: HTMLElement) => DraggableInfoSeed | false;
    getIndicatorPosition?: (draggableInfo: DraggableInfo, droppableElem: Element, position: string) => IndicatorPosition | false;
    onDragStart?: (draggableInfo: DraggableInfo) => void;
    onDragEnterContainer?: (draggableInfo: DraggableInfo) => void;
    onDragEnterDroppable?: (droppableElem: Element, position: string) => void;
    onDragOverDroppable?: (droppableElem: Element, position: string) => void;
    onDragLeaveDroppable?: (droppableElem: Element) => void;
    onDragLeaveContainer?: (draggableInfo: DraggableInfo) => void;
    onDragEnd?: () => void;
    onDrop?: (draggableInfo: DraggableInfo, droppableElem: Element | null, position: string | null) => boolean | void;
    onDropEnd?: (draggableInfo: DraggableInfo, success: boolean) => void;
    [key: string]: unknown;
}

export class DragDropContainer {
    element: HTMLElement;
    draggables: HTMLElement[] = [];
    droppables: HTMLElement[] = [];
    isDragEnabled = true;
    draggableSelector!: string;
    droppableSelector!: string;
    private _createGhostElement?: (draggableInfo: DraggableInfo) => Node | undefined;

    constructor(element: HTMLElement, options: DragDropContainerOptions) {
        if (options.createGhostElement) {
            this._createGhostElement = options.createGhostElement;
            delete options.createGhostElement;
        }

        Object.assign(this, {
            element,
            draggables: [],
            droppables: [],
            isDragEnabled: true
        }, options);

        this.element = element;
        element.dataset[constants.CONTAINER_DATA_ATTR] = 'true';

        this.refresh();
    }

    // get the draggable type and any dataset. Types:
    // - image
    // - card
    // - file
    // TODO: review types
    // TODO: get proper dataset from the gallery component
    // should be overridden by passed in option
    getDraggableInfo(_draggableElement?: HTMLElement): DraggableInfoSeed | false {
        return false;
    }

    // should be overridden by passed in option
    getIndicatorPosition(_draggableInfo?: DraggableInfo, _droppableElem?: Element, _position?: string): IndicatorPosition | false {
        return false;
    }

    // override these via constructor options
    onDragStart(_draggableInfo?: DraggableInfo) { }
    onDragEnterContainer(_draggableInfo?: DraggableInfo) { }
    onDragEnterDroppable(_droppableElem?: Element, _position?: string) { }
    onDragOverDroppable(_droppableElem?: Element, _position?: string) { }
    onDragLeaveDroppable(_droppableElem?: Element) { }
    onDragLeaveContainer(_draggableInfo?: DraggableInfo) { }
    onDragEnd() { }
    onDrop(_draggableInfo?: DraggableInfo, _droppableElem?: Element | null, _position?: string | null): boolean { return false; }
    onDropEnd(_draggableInfo?: DraggableInfo, _success?: boolean) { }

    // TODO: allow configuration for ghost element creation
    // builds an element that is attached to the mouse pointer when dragging.
    // currently grabs the first <img> and uses that but should be configurable:
    // - a selector for which element in the draggable to copy
    // - a function to hand off element creation to the consumer
    createGhostElement(draggableInfo: DraggableInfo): Node | undefined {
        let ghostElement: Node | undefined;

        if (typeof this._createGhostElement === 'function') {
            ghostElement = this._createGhostElement(draggableInfo);
        }

        if (!ghostElement && (draggableInfo.type === 'image' || draggableInfo.cardName === 'image')) {
            const image = draggableInfo.element.querySelector('img');
            if (image) {
                const aspectRatio = image.width / image.height;
                let width: number, height: number;

                // max ghost image size is 200px in either dimension
                if (image.width > image.height) {
                    width = 200;
                    height = 200 / aspectRatio;
                } else {
                    width = 200 * aspectRatio;
                    height = 200;
                }

                const imgEl = document.createElement('img');
                imgEl.width = width;
                imgEl.height = height;
                imgEl.id = 'koenig-drag-drop-ghost';
                imgEl.src = image.src;
                imgEl.style.position = 'absolute';
                imgEl.style.top = '0';
                imgEl.style.left = `-${width}px`;
                imgEl.style.zIndex = String(constants.GHOST_ZINDEX);
                imgEl.style.willChange = 'transform';
                ghostElement = imgEl;
            } else {

                console.warn('No <img> element found in draggable');
                return;
            }
        }

        if (ghostElement) {
            return ghostElement;
        }


        console.warn(`No default createGhostElement handler for type "${draggableInfo.type}"`);
    }

    enableDrag(): void {
        this.isDragEnabled = true;
        this.element.dataset[constants.CONTAINER_DATA_ATTR] = 'true';
        this.refresh();
    }

    disableDrag(): void {
        this.isDragEnabled = false;
        delete this.element.dataset[constants.CONTAINER_DATA_ATTR];
        this.refresh();
    }

    // used to add data attributes to any draggable/droppable elements. This is
    // for more efficient lookup through DOM by the drag-drop-handler service
    refresh(): void {
        // remove all data attributes for currently held draggable/droppable elements
        this.draggables.forEach((draggable) => {
            delete draggable.dataset[constants.DRAGGABLE_DATA_ATTR];
        });
        this.droppables.forEach((droppable) => {
            delete droppable.dataset[constants.DROPPABLE_DATA_ATTR];
        });

        // re-populate draggable/droppable arrays
        this.draggables = [];
        this.droppables = [];
        if (this.isDragEnabled) {
            this.element.querySelectorAll<HTMLElement>(this.draggableSelector).forEach((draggable) => {
                draggable.dataset[constants.DRAGGABLE_DATA_ATTR] = 'true';
                this.draggables.push(draggable);
            });
            this.element.querySelectorAll<HTMLElement>(this.droppableSelector).forEach((droppable) => {
                droppable.dataset[constants.DROPPABLE_DATA_ATTR] = 'true';
                this.droppables.push(droppable);
            });
        }
    }
}
