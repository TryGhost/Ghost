import {renderToString} from 'react-dom/server';
import EventEmitter from 'eventemitter3';
import {DragDropContainer} from './DragDropContainer';
import {ScrollHandler} from './ScrollHandler';
import * as constants from './draggable-constants';
import * as utils from './draggable-utils';

export class DragDropHandler {
    EE = null;
    editorContainerElement = null;
    containers = null;
    draggableInfo = null;
    ghostInfo = null;
    grabbedElement = null;
    scrollHandler = null;
    sourceContainer = null;

    _currentOverContainer = null;
    _currentOverContainerElem = null;
    _currentOverDroppableElem = null;
    _currentOverDroppablePosition = null;
    _dropIndicator = null;
    _elementsWithHoverRemoved = null;
    _eventHandlers = null;
    _ghostContainerElement = null;
    _rafUpdateGhostElementPosition = null;
    _transformedDroppables = null;
    _waitForDragStartPromise = null;

    // lifecycle ---------------------------------------------------------------

    constructor({editorContainerElement}) {
        this.editorContainerElement = editorContainerElement || document.querySelector('[data-kg-editor] [data-lexical-editor]');
        this.containers = [];
        this.scrollHandler = new ScrollHandler();
        this._eventHandlers = [];
        this._transformedDroppables = [];

        // bind any raf handler functions
        this._rafUpdateGhostElementPosition = this._updateGhostElementPosition.bind(this);

        // set up document event listeners
        this._addGrabListeners();

        // append body elements
        this._appendGhostContainerElement();

        this.EE = new EventEmitter();
    }

    destroy() {
        // reset any on-going drag and remove any temporary listeners
        this.cleanup();

        // clean up document event listeners
        this._removeGrabListeners();

        // remove body elements
        this._removeDropIndicator();
        this._removeGhostContainerElement();
    }

    // interface ---------------------------------------------------------------

    registerContainer(element, options) {
        const container = new DragDropContainer(element, options);
        this.containers.push(container);

        // return a minimal interface to the container because this class
        // should be used for management rather than the container class instance
        return {
            enableDrag: () => {
                container.enableDrag();
            },

            disableDrag: () => {
                container.disableDrag();
            },

            refresh: () => {
                // re-calculate draggables/droppables
                container.refresh();
            },

            destroy: () => {
                // unregister container
                container.disableDrag();
                this.containers = this.containers.filter(c => c !== container);
            }
        };
    }

    // remove all containers and event handlers, useful when leaving an editor route
    cleanup() {
        this.containers.forEach(container => container.disableDrag());
        this.containers = [];
        // cancel any tasks and remove intermittent event handlers
        this._resetDrag();
    }

    // event handlers ----------------------------------------------------------

    // we use a custom "drag" detection rather than native drag events because it
    // allows better tracking across multiple containers and gives more flexibility
    // for handling touch events later if required
    _onMouseDown(event) {
        if (!this.isDragging && (event.button === undefined || event.button === 0)) {
            this.grabbedElement = utils.getParent(event.target, constants.DRAGGABLE_SELECTOR);

            if (this.grabbedElement) {
                // some elements may have explicitly disabled dragging such as
                // captions where we want to allow text selection instead
                const dragDisabledElement = utils.getParent(event.target, constants.DRAG_DISABLED_SELECTOR);
                if (dragDisabledElement && this.grabbedElement.contains(dragDisabledElement)) {
                    return;
                }

                const containerElement = utils.getParent(this.grabbedElement, constants.CONTAINER_SELECTOR);
                const container = this.containers.find(c => c.element === containerElement);
                this.sourceContainer = container;

                if (container.isDragEnabled) {
                    this._waitForDragStart(event).then(() => {
                        // stop the drag creating a selection
                        window.getSelection().removeAllRanges();
                        // set up the drag details
                        this._initiateDrag(event);
                    }).catch((reason) => {
                        if (!reason.isCanceled) {
                            throw reason;
                        }
                    });
                }
            }
        }
    }

    _onMouseMove(event) {
        event.preventDefault();

        if (this.draggableInfo) {
            this.draggableInfo.mousePosition.x = event.clientX;
            this.draggableInfo.mousePosition.y = event.clientY;

            this._handleDrag(event);
        }
    }

    _onMouseUp() {
        if (this.draggableInfo) {
            let success = false;

            // TODO: accept object rather than positioned args? OR, should the
            // droppable data be stored on draggableInfo?
            if (this._currentOverContainer) {
                success = this._currentOverContainer.onDrop(
                    this.draggableInfo,
                    this._currentOverDroppableElem,
                    this._currentOverDroppablePosition
                );
            }

            this.containers.forEach((container) => {
                container.onDropEnd(this.draggableInfo, success);
            });
        }

        // remove drag info and any ghost element
        this._resetDrag();
    }

    // cancel drag on escape
    _onKeyDown(event) {
        if (this.isDragging && event.key === 'Escape') {
            this._resetDrag();
        }
    }

    // private -----------------------------------------------------------------

    // called when we detect a mousedown event on a draggable element. Sets
    // up temporary event handlers for mousemove, mouseup, and drag. If
    // sufficient movement is detected before the mouse is released and we don't
    // detect a native drag event then the promise will resolve. Mouseup or drag
    // events will cancel the promise which will result in a rejection with {isCanceled: true}
    async _waitForDragStart(startEvent) {
        const moveThreshold = 1;

        // if we somehow already have a waiting promise, cancel it and keep the new one
        if (this._waitForDragStartPromise) {
            this.EE.emit('drag-start-canceled');
            this._waitForDragStartPromise = null;
        }

        const onMove = (event) => {
            let {clientX: currentX, clientY: currentY} = event;

            if (
                Math.abs(startEvent.clientX - currentX) > moveThreshold ||
                Math.abs(startEvent.clientY - currentY) > moveThreshold
            ) {
                this.EE.emit('drag-start-conditions-met');
            }
        };

        const onUp = () => {
            this.EE.emit('drag-start-canceled');
        };

        const onHtmlDrag = () => {
            this.EE.emit('drag-start-canceled');
        };

        const waitForDragStart = () => {
            document.addEventListener('mousemove', onMove, {passive: false});
            document.addEventListener('mouseup', onUp, {passive: false});
            document.addEventListener('drag', onHtmlDrag, {passive: false});

            return new Promise((resolve, reject) => {
                const conditionsMet = () => {
                    this.EE.removeListener('drag-start-canceled', canceled);
                    resolve();
                };

                const canceled = () => {
                    this.EE.removeListener('drag-start-conditions-met', conditionsMet);
                    reject({isCanceled: true});
                };

                this.EE.once('drag-start-conditions-met', conditionsMet);
                this.EE.once('drag-start-canceled', canceled);
            });
        };

        this._waitForDragStartPromise = waitForDragStart()
            .finally(() => {
                this._waitForDragStartPromise = null;

                document.removeEventListener('mousemove', onMove, {passive: false});
                document.removeEventListener('mouseup', onUp, {passive: false});
                document.removeEventListener('drag', onHtmlDrag, {passive: false});
            });

        return this._waitForDragStartPromise;
    }

    // called once drag start conditions have been met, `startEvent` is the initial mousedown event
    _initiateDrag(startEvent) {
        this.isDragging = true;
        utils.applyUserSelect(document.body, 'none');

        let draggableInfo = this.sourceContainer.getDraggableInfo(this.grabbedElement);

        if (!draggableInfo) {
            this._resetDrag();
            return;
        }

        // append the drop indicator if it doesn't already exist - we append to
        // the editor's element rather than body so it needs to be re-appended
        // each time a drag is initiated in a new editor instance
        this._appendDropIndicator();

        draggableInfo = Object.assign({}, draggableInfo, {
            element: this.grabbedElement,
            mousePosition: {
                x: startEvent.clientX,
                y: startEvent.clientY
            }
        });
        this.draggableInfo = draggableInfo;

        this.containers.forEach((container) => {
            container.onDragStart(draggableInfo);
        });

        // style the dragged element
        this.draggableInfo.element.style.opacity = 0.5;

        // create the ghost element and cache its position to avoid costly
        // getBoundingClientRect calls in the mousemove handler
        const ghostElement = this.sourceContainer.createGhostElement(this.draggableInfo);
        if (ghostElement && ghostElement instanceof HTMLElement) {
            this._ghostContainerElement.appendChild(ghostElement);
            const ghostElementRect = ghostElement.getBoundingClientRect();
            const ghostInfo = {
                element: ghostElement,
                positionX: ghostElementRect.x,
                positionY: ghostElementRect.y
            };
            this.ghostInfo = ghostInfo;
        } else {
            // eslint-disable-next-line
            console.warn('container.createGhostElement did not return an element', this.draggableInfo, { ghostElement });
            this._resetDrag();
            return;
        }

        // add watches to follow the drag/drop
        this._addMoveListeners();
        this._addReleaseListeners();
        this._addKeyDownListeners();

        // start ghost element following the mouse
        requestAnimationFrame(this._rafUpdateGhostElementPosition);

        // let the scroll handler select the scrollable element
        this.scrollHandler.dragStart(this.draggableInfo);

        // prevent the pointer showing the text caret over text content whilst dragging
        document.querySelectorAll('[data-kg="editor"] [data-lexical-editor]').forEach((el) => {
            el.style.setProperty('cursor', 'default', 'important');
        });

        // prevent hover effects showing whilst dragging
        this._removeHoverClasses();

        this._handleDrag();
    }

    _removeHoverClasses() {
        this._restoreHoverClasses();

        this._elementsWithHoverRemoved = new Map();

        const elementsWithHover = document.querySelectorAll('[class*="hover:"]');

        elementsWithHover.forEach((element) => {
            const hoverClasses = Array.from(element.classList.values()).filter(cls => cls.startsWith('hover:'));

            this._elementsWithHoverRemoved.set(element, hoverClasses);

            element.classList.remove(...hoverClasses);
        });
    }

    _restoreHoverClasses() {
        if (!this._elementsWithHoverRemoved) {
            return;
        }

        this._elementsWithHoverRemoved.forEach((hoverClasses, element) => {
            element.classList.add(...hoverClasses);
        });

        this._elementsWithHoverRemoved = new Map();
    }

    // called when mouse moves whilst a drag is in progress
    _handleDrag(event) {
        // hide the ghost element so that it's not picked up by elementFromPoint
        // when determining the target element under the mouse
        this._ghostContainerElement.hidden = true;
        const target = document.elementFromPoint(
            this.draggableInfo.mousePosition.x,
            this.draggableInfo.mousePosition.y
        );
        this.draggableInfo.target = target;
        this._ghostContainerElement.hidden = false;

        this.scrollHandler.dragMove(this.draggableInfo);

        const overContainerElem = utils.getParent(target, constants.CONTAINER_SELECTOR);
        let overDroppableElem = utils.getParent(target, constants.DROPPABLE_SELECTOR);

        // it's possible for the mouse to be over a "dead" area when dragging over
        // the position indicator, in this case we want to prevent a parent
        // container's droppable from being picked up
        if (!overContainerElem || !overContainerElem.contains(overDroppableElem)) {
            overDroppableElem = null;
        }

        const isLeavingContainer = this._currentOverContainerElem && overContainerElem !== this._currentOverContainerElem;
        const isLeavingDroppable = this._currentOverDroppableElem && overDroppableElem !== this._currentOverDroppableElem;
        const isOverContainer = overContainerElem && overContainerElem !== this._currentOverContainer;
        const isOverDroppable = overDroppableElem;

        if (isLeavingContainer) {
            this._currentOverContainer.onDragLeaveContainer();
            this._currentOverContainer = null;
            this._currentOverContainerElem = null;
            this._hideDropIndicator();
        }

        if (isOverContainer) {
            const container = this.containers.find(c => c.element === overContainerElem);
            if (!this._currentOverContainer) {
                container.onDragEnterContainer();
            }

            this._currentOverContainer = container;
            this._currentOverContainerElem = overContainerElem;
        }

        if (isLeavingDroppable) {
            if (this._currentOverContainer) {
                this._currentOverContainer.onDragLeaveDroppable(overDroppableElem);
            }
            this._currentOverDroppableElem = null;
        }

        if (isOverDroppable) {
            // get position within the droppable
            const rect = overDroppableElem.getBoundingClientRect();
            const inTop = this.draggableInfo.mousePosition.y < (rect.y + rect.height / 2);
            const inLeft = this.draggableInfo.mousePosition.x < (rect.x + rect.width / 2);
            const position = `${inTop ? 'top' : 'bottom'}-${inLeft ? 'left' : 'right'}`;

            if (!this._currentOverDroppableElem) {
                this._currentOverContainer.onDragEnterDroppable(overDroppableElem, position);
            }

            if (overDroppableElem !== this._currentOverDroppableElem || position !== this._currentOverDroppablePosition) {
                this._currentOverDroppableElem = overDroppableElem;
                this._currentOverDroppablePosition = position;
                this._currentOverContainer.onDragOverDroppable(overDroppableElem, position);

                // container.getIndicatorPosition returns false if the drop is not allowed
                const indicatorPosition = this._currentOverContainer.getIndicatorPosition(this.draggableInfo, overDroppableElem, position);
                if (indicatorPosition) {
                    this.draggableInfo.insertIndex = indicatorPosition.insertIndex;
                    this._showDropIndicator(indicatorPosition);
                } else {
                    this._hideDropIndicator();
                }
            }
        }
    }

    _updateGhostElementPosition() {
        if (this.isDragging) {
            requestAnimationFrame(this._rafUpdateGhostElementPosition);
        }

        const {ghostInfo, draggableInfo} = this;
        if (draggableInfo && ghostInfo) {
            const left = (ghostInfo.positionX * -1) + draggableInfo.mousePosition.x;
            const top = (ghostInfo.positionY * -1) + draggableInfo.mousePosition.y;
            ghostInfo.element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        }
    }

    // direction = horizontal/vertical
    // horizontal = beforeElems shift left, afterElems shift right
    // vertical = afterElems shift down
    // position = above/below/left/right, used to place the indicator
    _showDropIndicator({direction, position, beforeElems, afterElems}) {
        const dropIndicator = this._dropIndicator;

        // reset everything except insertIndex before re-displaying indicator
        this._hideDropIndicator({clearInsertIndex: false});

        if (direction === 'horizontal') {
            beforeElems.forEach((elem) => {
                elem.style.transform = 'translate3d(-30px, 0, 0)';
                elem.style.transitionDuration = '250ms';
                this._transformedDroppables.push(elem);
            });

            afterElems.forEach((elem) => {
                elem.style.transform = 'translate3d(30px, 0, 0)';
                elem.style.transitionDuration = '250ms';
                this._transformedDroppables.push(elem);
            });

            let leftAdjustment = 0;
            const droppable = this._currentOverDroppableElem;
            const droppableStyles = getComputedStyle(droppable);
            // calculate position based on offset parent to avoid the transform
            // being accounted for
            const parentRect = droppable.offsetParent.getBoundingClientRect();
            const offsetLeft = parentRect.left + droppable.offsetLeft;
            const offsetTop = parentRect.top + droppable.offsetTop;

            if (position === 'left') {
                leftAdjustment -= parseInt(droppableStyles.marginLeft);
            } else {
                leftAdjustment += parseInt(droppable.offsetWidth) + parseInt(droppableStyles.marginRight);
            }

            // account for indicator width
            leftAdjustment -= 2;

            const dropIndicatorParentRect = dropIndicator.parentNode.getBoundingClientRect();
            const lastLeft = parseInt(dropIndicator.style.left);
            const lastTop = parseInt(dropIndicator.style.top);
            const newLeft = offsetLeft + leftAdjustment - dropIndicatorParentRect.left;
            const newTop = offsetTop - dropIndicatorParentRect.top;
            const newHeight = droppable.offsetHeight;

            // if indicator hasn't moved, keep it showing, otherwise wait for
            // the transform transitions to almost finish before re-positioning
            // and showing
            // NOTE: +- 1px is due to sub-pixel positioning of droppables
            if (
                newTop >= lastTop - 1 && newTop <= lastTop + 1 &&
                newLeft >= lastLeft - 1 && newLeft <= lastLeft + 1
            ) {
                dropIndicator.style.opacity = 1;
            } else {
                dropIndicator.style.opacity = 0;

                this._dropIndicatorTimeout = setTimeout(this, function () {
                    dropIndicator.style.width = '4px';
                    dropIndicator.style.height = `${newHeight}px`;
                    dropIndicator.style.left = `${newLeft}px`;
                    dropIndicator.style.top = `${newTop}px`;
                    dropIndicator.style.opacity = 1;
                }, 150);
            }
        }

        if (direction === 'vertical') {
            let transformSize = 60;
            const droppable = this._currentOverDroppableElem;
            let topElement, bottomElement;

            if (position === 'top') {
                topElement = utils.getPreviousSibling(droppable, constants.DROPPABLE_SELECTOR);
                bottomElement = droppable;
            } else if (position === 'bottom') {
                topElement = droppable;
                bottomElement = utils.getNextSibling(droppable, constants.DROPPABLE_SELECTOR);
            }

            // marginTop of the first element affects the offset of the
            // children so it needs to be taken into account
            const firstElement = (topElement || bottomElement).parentElement.children[0];
            const firstElementStyles = getComputedStyle(firstElement);
            const firstTopMargin = parseInt(firstElementStyles.marginTop);

            const newWidth = droppable.offsetWidth;
            const newLeft = droppable.offsetLeft;
            let newTop;

            if (topElement && bottomElement) {
                const topElementStyles = getComputedStyle(topElement);
                const bottomElementStyles = getComputedStyle(bottomElement);

                const offsetTop = bottomElement.offsetTop;

                const topMargin = parseInt(topElementStyles.marginBottom);
                const bottomMargin = parseInt(bottomElementStyles.marginTop);
                const marginHeight = topMargin + bottomMargin;

                newTop = offsetTop - (marginHeight / 2) + firstTopMargin;
            } else if (topElement) {
                // at the bottom of the container
                newTop = topElement.offsetTop + topElement.offsetHeight + firstTopMargin;
            } else if (bottomElement) {
                // at the top of the container, place the indicator 0px from the top
                newTop = -26; // account for later adjustments and indicator height
                transformSize = 30; // halve normal adjustment because there's no gap needed between top element
            }

            // account for indicator height
            newTop -= 2;

            // vertical always pushes elements down
            newTop += 30;

            // if indicator hasn't moved, keep it showing, otherwise wait for
            // the transform transitions to almost finish before re-positioning
            // and showing
            // NOTE: +- 1px is due to sub-pixel positioning of droppables
            let lastLeft = parseInt(dropIndicator.style.left);
            let lastTop = parseInt(dropIndicator.style.top);

            if (
                newTop >= lastTop - 1 && newTop <= lastTop + 1 &&
                newLeft >= lastLeft - 1 && newLeft <= lastLeft + 1
            ) {
                dropIndicator.style.opacity = 1;
            } else {
                dropIndicator.style.opacity = 0;

                this._dropIndicatorTimeout = setTimeout(() => {
                    dropIndicator.style.height = '4px';
                    dropIndicator.style.width = `${newWidth}px`;
                    dropIndicator.style.left = `${newLeft}px`;
                    dropIndicator.style.top = `${newTop}px`;
                    dropIndicator.style.opacity = 1;
                }, 150);
            }

            // always update the droppable transforms so that re-positining in
            // the same place still moves the elements. Effectively a no-op if
            // the styles already exist
            beforeElems.forEach((elem) => {
                elem.style.transform = 'translate3d(0, 0, 0)';
                elem.style.transitionDuration = '250ms';
                this._transformedDroppables.push(elem);
            });

            afterElems.forEach((elem) => {
                elem.style.transform = `translate3d(0, ${transformSize}px, 0)`;
                elem.style.transitionDuration = '250ms';
                this._transformedDroppables.push(elem);
            });
        }
    }

    _hideDropIndicator({clearInsertIndex = true} = {}) {
        // make sure the indicator isn't shown due to a running timeout
        clearTimeout(this._dropIndicatorTimeout);

        // clear droppable insert index unless instructed not to (eg, when
        // resetting the display before re-positioning the indicator)
        if (clearInsertIndex && this.draggableInfo) {
            delete this.draggableInfo.insertIndex;
        }

        // reset all transforms
        this._transformedDroppables.forEach((elem) => {
            elem.style.transform = '';
        });
        this.transformedDroppables = [];

        // hide drop indicator
        if (this._dropIndicator) {
            this._dropIndicator.style.opacity = 0;
        }
    }

    _resetDrag() {
        this.EE.emit('drag-start-canceled');
        this._hideDropIndicator();
        this._removeMoveListeners();
        this._removeReleaseListeners();

        this.scrollHandler.dragStop();

        if (this.grabbedElement) {
            this.grabbedElement.style.opacity = '';
        }

        this.isDragging = false;
        this.grabbedElement = null;
        this.sourceContainer = null;

        if (this.ghostInfo) {
            this.ghostInfo.element.remove();
            this.ghostInfo = null;
        }

        this.containers.forEach((container) => {
            container.onDragEnd();
        });

        this._restoreHoverClasses();

        utils.applyUserSelect(document.body, '');
        document.querySelectorAll('[data-kg="editor"] [data-lexical-editor]').forEach((el) => {
            el.style.cursor = '';
        });
    }

    _appendDropIndicator() {
        let dropIndicator = document.querySelector(`#${constants.DROP_INDICATOR_ID}`);
        if (!dropIndicator) {
            // React component so Tailwind picks up class usage
            const DropIndicator = () => {
                const style = {
                    position: 'absolute',
                    opacity: 0,
                    width: '4px',
                    height: 0,
                    zIndex: constants.DROP_INDICATOR_ZINDEX,
                    pointerEvents: 'none'
                };

                return (
                    <div id={constants.DROP_INDICATOR_ID} className="rounded-full bg-green" style={style}></div>
                );
            };

            // uses "server-side" renderToString here because we need a real DOM element
            // synchronously which client-side ReactDOM can't give us
            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderToString(<DropIndicator />);
            dropIndicator = wrapper.firstChild;

            this.editorContainerElement.appendChild(dropIndicator);
        }

        this._dropIndicator = dropIndicator;
    }

    _removeDropIndicator() {
        this._dropIndicator?.remove();
    }

    _appendGhostContainerElement() {
        if (!this._ghostContainerElement) {
            const ghostContainerElement = document.createElement('div');
            ghostContainerElement.id = constants.GHOST_CONTAINER_ID;
            ghostContainerElement.style.position = 'fixed';
            ghostContainerElement.style.width = '100%';
            ghostContainerElement.style.zIndex = constants.DROP_INDICATOR_ZINDEX + 1;

            this.editorContainerElement.appendChild(ghostContainerElement);

            this._ghostContainerElement = ghostContainerElement;
        }
    }

    _removeGhostContainerElement() {
        this._ghostContainerElement?.remove();
    }

    _addGrabListeners() {
        this._addEventListener('mousedown', this._onMouseDown, {passive: false});
    }

    _removeGrabListeners() {
        this._removeEventListener('mousedown');
    }

    _addMoveListeners() {
        this._addEventListener('mousemove', this._onMouseMove, {passive: false});
    }

    _removeMoveListeners() {
        this._removeEventListener('mousemove');
    }

    _addReleaseListeners() {
        this._addEventListener('mouseup', this._onMouseUp, {passive: false});
    }

    _removeReleaseListeners() {
        this._removeEventListener('mouseup');
    }

    _addKeyDownListeners() {
        this._addEventListener('keydown', this._onKeyDown);
    }

    _removeKeyDownListeners() {
        this._removeEventListener('keydown');
    }

    _addEventListener(e, method, options) {
        if (!this._eventHandlers[e]) {
            let handler = method.bind(this);
            this._eventHandlers[e] = {handler, options};
            document.addEventListener(e, handler, options);
        }
    }

    _removeEventListener(e) {
        let event = this._eventHandlers[e];
        if (event) {
            document.removeEventListener(e, event.handler, event.options);
            delete this._eventHandlers[e];
        }
    }
}
