import * as constants from './constants';
import {A} from '@ember/array';

// Container represents an element, inside which are draggables and/or droppables.
//
// Containers handle events triggered by the koenig-drag-drop-handler service.
// Containers can be nested, the drag-drop service will select the closest
// parent container in the DOM heirarchy when triggering events.
//
// Containers accept options which are mostly configuration for how to determine
// contained draggable/droppable elements and functions to call when events are
// processed.

class Container {
    constructor(element, options) {
        if (options.createGhostElement) {
            this._createGhostElement = options.createGhostElement;
            delete options.createGhostElement;
        }

        Object.assign(this, {
            element,
            draggables: A([]),
            droppables: A([]),
            isDragEnabled: true
        }, options);

        element.dataset[constants.CONTAINER_DATA_ATTR] = 'true';

        this.refresh();
    }

    // get the draggable type and any payload. Types:
    // - image
    // - card
    // - file
    // TODO: review types
    // TODO: get proper payload from the gallery component
    // should be overridden by passed in option
    getDraggableInfo(/*draggableElement*/) {
        return false;
    }

    // should be overridden by passed in option
    getIndicatorPosition(/*draggableInfo, droppableElem, position*/) {
        return false;
    }

    // override these via constructor options
    onDragStart() { }
    onDragEnterContainer() { }
    onDragEnterDroppable() { }
    onDragOverDroppable() { }
    onDragLeaveDroppable() { }
    onDragLeaveContainer() { }
    onDragEnd() { }
    onDrop() { }
    onDropEnd() { }

    // TODO: allow configuration for ghost element creation
    // builds an element that is attached to the mouse pointer when dragging.
    // currently grabs the first <img> and uses that but should be configurable:
    // - a selector for which element in the draggable to copy
    // - a function to hand off element creation to the consumer
    createGhostElement(draggableInfo) {
        let ghostElement;

        if (typeof this._createGhostElement === 'function') {
            ghostElement = this._createGhostElement(draggableInfo);
        }

        if (!ghostElement && (draggableInfo.type === 'image' || draggableInfo.cardName === 'image')) {
            let image = draggableInfo.element.querySelector('img');
            if (image) {
                let aspectRatio = image.width / image.height;
                let width, height;

                // max ghost image size is 200px in either dimension
                if (image.width > image.height) {
                    width = 200;
                    height = 200 / aspectRatio;
                } else {
                    width = 200 * aspectRatio;
                    height = 200;
                }

                ghostElement = document.createElement('img');
                ghostElement.width = width;
                ghostElement.height = height;
                ghostElement.id = 'koenig-drag-drop-ghost';
                ghostElement.src = image.src;
                ghostElement.style.position = 'absolute';
                ghostElement.style.top = '0';
                ghostElement.style.left = `-${width}px`;
                ghostElement.style.zIndex = constants.GHOST_ZINDEX;
                ghostElement.style.willChange = 'transform';
            } else {
                // eslint-disable-next-line
                console.warn('No <img> element found in draggable');
                return;
            }
        }

        if (ghostElement) {
            return ghostElement;
        }

        // eslint-disable-next-line
        console.warn(`No default createGhostElement handler for type "${draggableInfo.type}"`);
    }

    enableDrag() {
        this.isDragEnabled = true;
        this.element.dataset[constants.CONTAINER_DATA_ATTR] = 'true';
        this.refresh();
    }

    disableDrag() {
        this.isDragEnabled = false;
        delete this.element.dataset[constants.CONTAINER_DATA_ATTR];
        this.refresh();
    }

    // used to add data attributes to any draggable/droppable elements. This is
    // for more efficient lookup through DOM by the drag-drop-handler service
    refresh() {
        // remove all data attributes for currently held draggable/droppable elements
        this.draggables.forEach((draggable) => {
            delete draggable.dataset[constants.DRAGGABLE_DATA_ATTR];
        });
        this.droppables.forEach((droppable) => {
            delete droppable.dataset[constants.DROPPABLE_DATA_ATTR];
        });

        // re-populate draggable/droppable arrays
        this.draggables = A([]);
        this.droppables = A([]);
        if (this.isDragEnabled) {
            this.element.querySelectorAll(this.draggableSelector).forEach((draggable) => {
                draggable.dataset[constants.DRAGGABLE_DATA_ATTR] = 'true';
                this.draggables.push(draggable);
            });
            this.element.querySelectorAll(this.droppableSelector).forEach((droppable) => {
                droppable.dataset[constants.DROPPABLE_DATA_ATTR] = 'true';
                this.droppables.push(droppable);
            });
        }
    }
}

export default Container;
