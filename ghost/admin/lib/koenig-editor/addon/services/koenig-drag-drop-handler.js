import * as constants from '../lib/dnd/constants';
import * as utils from '../lib/dnd/utils';
import Container from '../lib/dnd/container';
import ScrollHandler from '../lib/dnd/scroll-handler';
import Service from '@ember/service';
import {A} from '@ember/array';
import {alias} from '@ember/object/computed';
import {didCancel, task, waitForProperty} from 'ember-concurrency';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

// this service allows registration of "containers"
// containers can have both draggables and droppables
// - draggables are elements that can be dragged
// - droppables are elements that should respond if dragged over
// containers will handle the drag start/drag over/drop events triggered by this service
// this service keeps track of all containers and has centralized event handling for mouse events

export default Service.extend({
    koenigUi: service(),

    containers: null,
    ghostInfo: null,
    grabbedElement: null, // TODO: standardise on draggableInfo.element
    sourceContainer: null,

    isDragging: alias('koenigUi.isDragging'),

    _eventHandlers: null,

    // lifecycle ---------------------------------------------------------------

    init() {
        this._super(...arguments);

        this.containers = A([]);
        this.scrollHandler = new ScrollHandler();
        this._eventHandlers = {};
        this._transformedDroppables = A([]);

        // bind any raf handler functions
        this._rafUpdateGhostElementPosition = run.bind(this, this._updateGhostElementPosition);

        // set up document event listeners
        this._addGrabListeners();

        // append body elements
        this._appendGhostContainerElement();
    },

    willDestroy() {
        this._super(...arguments);

        // reset any on-going drag and remove any temporary listeners
        this.cleanup();

        // clean up document event listeners
        this._removeGrabListeners();

        // remove body elements
        this._removeDropIndicator();
        this._removeGhostContainerElement();
    },

    // interface ---------------------------------------------------------------

    registerContainer(element, options) {
        let container = new Container(element, options);
        this.containers.pushObject(container);

        // return a minimal interface to the container because this service
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
                this.containers.removeObject(container);
            }
        };
    },

    // remove all containers and event handlers, useful when leaving an editor route
    cleanup() {
        this.containers = A([]);
        // cancel any tasks and remove intermittent event handlers
        this._resetDrag();
    },

    // event handlers ----------------------------------------------------------

    // we use a custom "drag" detection rather than native drag events because it
    // allows better tracking across multiple containers and gives more flexibilty
    // for handling touch events later if required
    _onMouseDown(event) {
        if (!this.isDragging && (event.button === undefined || event.button === 0)) {
            this.grabbedElement = utils.getParent(event.target, constants.DRAGGABLE_SELECTOR);

            if (this.grabbedElement) {
                // some elements may have explicitly disabled dragging such as
                // captions where we want to allow text selection instead
                let dragDisabledElement = utils.getParent(event.target, constants.DRAG_DISABLED_SELECTOR);
                if (dragDisabledElement && this.grabbedElement.contains(dragDisabledElement)) {
                    return;
                }

                let containerElement = utils.getParent(this.grabbedElement, constants.CONTAINER_SELECTOR);
                let container = this.containers.findBy('element', containerElement);
                this.sourceContainer = container;

                if (container.isDragEnabled) {
                    this._waitForDragStart.perform(event).then(() => {
                        // stop the drag creating a selection
                        window.getSelection().removeAllRanges();
                        // set up the drag details
                        this._initiateDrag(event);
                    }).catch((error) => {
                        // ignore cancelled tasks and throw unrecognized errors
                        if (!didCancel(error)) {
                            throw error;
                        }
                    });
                }
            }
        }
    },

    _onMouseMove(event) {
        event.preventDefault();

        if (this.draggableInfo) {
            this.draggableInfo.mousePosition.x = event.clientX;
            this.draggableInfo.mousePosition.y = event.clientY;

            this._handleDrag(event);
        }
    },

    _onMouseUp(/*event*/) {
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
    },

    _onKeyDown(event) {
        // cancel drag on escape
        if (this.isDragging && event.key === 'Escape') {
            this._resetDrag();
        }
    },

    // private -----------------------------------------------------------------

    // called when we detect a mousedown event on a draggable element. Sets
    // up temporary event handlers for mousemove, mouseup, and drag. If
    // sufficient movement is detected before the mouse is released and we don't
    // detect a native drag event then the task will resolve. Mouseup or drag
    // events will cancel the task which will result in a rejected promise if
    // the task has been cast to a promise
    _waitForDragStart: task(function* (startEvent) {
        let moveThreshold = 1;

        this.set('_dragStartConditionsMet', false);

        let onMove = (event) => {
            let {clientX: currentX, clientY: currentY} = event;

            if (
                Math.abs(startEvent.clientX - currentX) > moveThreshold ||
                Math.abs(startEvent.clientY - currentY) > moveThreshold
            ) {
                this.set('_dragStartConditionsMet', true);
            }
        };

        let onUp = () => {
            this._waitForDragStart.cancelAll();
        };

        // give preference to native drag/drop handlers
        let onHtmlDrag = () => {
            this._waitForDragStart.cancelAll();
        };

        // register local events
        document.addEventListener('mousemove', onMove, {passive: false});
        document.addEventListener('mouseup', onUp, {passive: false});
        document.addEventListener('drag', onHtmlDrag, {passive: false});

        try {
            yield waitForProperty(this, '_dragStartConditionsMet');
        } finally {
            // finally is always called on task cancellation
            this.set('_dragStartConditionsMet', false);
            document.removeEventListener('mousemove', onMove, {passive: false});
            document.removeEventListener('mouseup', onUp, {passive: false});
            document.removeEventListener('drag', onHtmlDrag, {passive: false});
        }
    }).keepLatest(),

    _initiateDrag(startEvent) {
        this.set('isDragging', true);
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
        this.set('draggableInfo', draggableInfo);

        this.containers.forEach((container) => {
            container.onDragStart(draggableInfo);
        });

        // style the dragged element
        this.draggableInfo.element.style.opacity = 0.5;

        // create the ghost element and cache it's position so avoid costly
        // getBoundingClientRect calls in the mousemove handler
        let ghostElement = this.sourceContainer.createGhostElement(this.draggableInfo);
        if (ghostElement && ghostElement instanceof HTMLElement) {
            this._ghostContainerElement.appendChild(ghostElement);
            let ghostElementRect = ghostElement.getBoundingClientRect();
            let ghostInfo = {
                element: ghostElement,
                positionX: ghostElementRect.x,
                positionY: ghostElementRect.y
            };
            this.set('ghostInfo', ghostInfo);
        } else {
            // eslint-disable-next-line
            console.warn('container.createGhostElement did not return an element', this.draggableInfo, {ghostElement});
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
        document.querySelectorAll('[data-kg="editor"]').forEach((el) => {
            el.style.setProperty('cursor', 'default', 'important');
        });

        // prevent card hover showing whilst dragging
        this._elementsWithHoverRemoved = document.querySelectorAll('.kg-card-hover');
        this._elementsWithHoverRemoved.forEach((el) => {
            el.classList.remove('kg-card-hover');
        });

        this._handleDrag();
    },

    _handleDrag() {
        // hide the ghost element so that it's not picked up by elementFromPoint
        // when determining the target element under the mouse
        this._ghostContainerElement.hidden = true;
        let target = document.elementFromPoint(
            this.draggableInfo.mousePosition.x,
            this.draggableInfo.mousePosition.y
        );
        this.draggableInfo.target = target;
        this._ghostContainerElement.hidden = false;

        this.scrollHandler.dragMove(this.draggableInfo);

        let overContainerElem = utils.getParent(target, constants.CONTAINER_SELECTOR);
        let overDroppableElem = utils.getParent(target, constants.DROPPABLE_SELECTOR);

        // it's possible for the mouse to be over a "dead" area when dragging over
        // the position indicator, in this case we want to prevent a parent
        // container's droppable from being picked up
        if (!overContainerElem || !overContainerElem.contains(overDroppableElem)) {
            overDroppableElem = null;
        }

        let isLeavingContainer = this._currentOverContainerElem && overContainerElem !== this._currentOverContainerElem;
        let isLeavingDroppable = this._currentOverDroppableElem && overDroppableElem !== this._currentOverDroppableElem;
        let isOverContainer = overContainerElem && overContainerElem !== this._currentOverContainer;
        let isOverDroppable = overDroppableElem;

        if (isLeavingContainer) {
            this._currentOverContainer.onDragLeaveContainer();
            this._currentOverContainer = null;
            this._currentOverContainerElem = null;
            this._hideDropIndicator();
        }

        if (isOverContainer) {
            let container = this.containers.findBy('element', overContainerElem);
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
            // TODO: cache droppable rects to avoid costly queries whilst dragging
            let rect = overDroppableElem.getBoundingClientRect();
            let inTop = this.draggableInfo.mousePosition.y < (rect.y + rect.height / 2);
            let inLeft = this.draggableInfo.mousePosition.x < (rect.x + rect.width / 2);
            let position = `${inTop ? 'top' : 'bottom'}-${inLeft ? 'left' : 'right'}`;

            if (!this._currentOverDroppableElem) {
                this._currentOverContainer.onDragEnterDroppable(overDroppableElem, position);
            }

            if (overDroppableElem !== this._currentOverDroppableElem || position !== this._currentOverDroppablePosition) {
                this._currentOverDroppableElem = overDroppableElem;
                this._currentOverDroppablePosition = position;
                this._currentOverContainer.onDragOverDroppable(overDroppableElem, position);

                // container.getIndicatorPosition returns false if the drop is not allowed
                let indicatorPosition = this._currentOverContainer.getIndicatorPosition(this.draggableInfo, overDroppableElem, position);
                if (indicatorPosition) {
                    this.draggableInfo.insertIndex = indicatorPosition.insertIndex;
                    this._showDropIndicator(indicatorPosition);
                } else {
                    this._hideDropIndicator();
                }
            }
        }
    },

    _updateGhostElementPosition() {
        if (this.isDragging) {
            requestAnimationFrame(this._rafUpdateGhostElementPosition);
        }

        let {ghostInfo, draggableInfo} = this;
        if (draggableInfo && ghostInfo) {
            let left = (ghostInfo.positionX * -1) + draggableInfo.mousePosition.x;
            let top = (ghostInfo.positionY * -1) + draggableInfo.mousePosition.y;
            ghostInfo.element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        }
    },

    // direction = horizontal/vertical
    // horizontal = beforeElems shift left, afterElems shift right
    // vertical = afterElems shift down
    // position = above/below/left/right, used to place the indicator
    _showDropIndicator({direction, position, beforeElems, afterElems}) {
        let dropIndicator = this._dropIndicator;

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
            let droppable = this._currentOverDroppableElem;
            let droppableStyles = getComputedStyle(droppable);
            // calculate position based on offset parent to avoid the transform
            // being accounted for
            let parentRect = droppable.offsetParent.getBoundingClientRect();
            let offsetLeft = parentRect.left + droppable.offsetLeft;
            let offsetTop = parentRect.top + droppable.offsetTop;

            if (position === 'left') {
                leftAdjustment -= parseInt(droppableStyles.marginLeft);
            } else {
                leftAdjustment += parseInt(droppable.offsetWidth) + parseInt(droppableStyles.marginRight);
            }

            // account for indicator width
            leftAdjustment -= 2;

            let dropIndicatorParentRect = dropIndicator.parentNode.getBoundingClientRect();
            let lastLeft = parseInt(dropIndicator.style.left);
            let lastTop = parseInt(dropIndicator.style.top);
            let newLeft = offsetLeft + leftAdjustment - dropIndicatorParentRect.left;
            let newTop = offsetTop - dropIndicatorParentRect.top;
            let newHeight = droppable.offsetHeight;

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

                this._dropIndicatorTimeout = run.later(this, function () {
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
            let droppable = this._currentOverDroppableElem;
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
            let firstElement = (topElement || bottomElement).parentElement.children[0];
            let firstElementStyles = getComputedStyle(firstElement);
            let firstTopMargin = parseInt(firstElementStyles.marginTop);

            let newWidth = droppable.offsetWidth;
            let newLeft = droppable.offsetLeft;
            let newTop;

            if (topElement && bottomElement) {
                let topElementStyles = getComputedStyle(topElement);
                let bottomElementStyles = getComputedStyle(bottomElement);

                let offsetTop = bottomElement.offsetTop;

                let topMargin = parseInt(topElementStyles.marginBottom);
                let bottomMargin = parseInt(bottomElementStyles.marginTop);
                let marginHeight = topMargin + bottomMargin;

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

                this._dropIndicatorTimeout = run.later(this, function () {
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
    },

    _hideDropIndicator({clearInsertIndex = true} = {}) {
        // make sure the indicator isn't shown due to a running timeout
        run.cancel(this._dropIndicatorTimeout);

        // clear droppable insert index unless instructed not to (eg, when
        // resetting the display before re-positioning the indicator)
        if (clearInsertIndex && this.draggableInfo) {
            delete this.draggableInfo.insertIndex;
        }

        // reset all transforms
        this._transformedDroppables.forEach((elem) => {
            elem.style.transform = '';
        });
        this.transformedDroppables = A([]);

        // hide drop indicator
        if (this._dropIndicator) {
            this._dropIndicator.style.opacity = 0;
        }
    },

    _resetDrag() {
        this._waitForDragStart.cancelAll();
        this._hideDropIndicator();
        this._removeMoveListeners();
        this._removeReleaseListeners();

        this.scrollHandler.dragStop();

        if (this.grabbedElement) {
            this.grabbedElement.style.opacity = '';
        }

        this.set('isDragging', false);
        this.set('grabbedElement', null);
        this.set('sourceContainer', null);

        if (this.ghostInfo) {
            this.ghostInfo.element.remove();
            this.set('ghostInfo', null);
        }

        this.containers.forEach((container) => {
            container.onDragEnd();
        });

        if (this._elementsWithHoverRemoved) {
            this._elementsWithHoverRemoved.forEach((el) => {
                el.classList.add('kg-card-hover');
            });
        }
        delete this._elementsWithHoverRemoved;

        utils.applyUserSelect(document.body, '');
        document.querySelectorAll('[data-kg="editor"]').forEach((el) => {
            el.style.cursor = '';
        });
    },

    _appendDropIndicator() {
        let dropIndicator = document.querySelector(`#${constants.DROP_INDICATOR_ID}`);
        if (!dropIndicator) {
            dropIndicator = document.createElement('div');
            dropIndicator.id = constants.DROP_INDICATOR_ID;
            dropIndicator.classList.add('bg-green', 'br-pill');
            dropIndicator.style.position = 'absolute';
            dropIndicator.style.opacity = 0;
            dropIndicator.style.width = '4px';
            dropIndicator.style.height = 0;
            dropIndicator.style.zIndex = constants.DROP_INDICATOR_ZINDEX;
            dropIndicator.style.pointerEvents = 'none';

            // TODO: the scrollableElement should probably be configurable, it
            // may need to be set on a per-container basis in case there are
            // scrollable containers within a card
            let scrollableElement = document.querySelector('.koenig-editor')
                || utils.getDocumentScrollingElement();
            scrollableElement.appendChild(dropIndicator);
        }
        this._dropIndicator = dropIndicator;
    },

    _appendGhostContainerElement() {
        if (!this._ghostContainerElement) {
            let ghostContainerElement = document.createElement('div');
            ghostContainerElement.id = constants.GHOST_CONTAINER_ID;
            ghostContainerElement.style.position = 'fixed';
            ghostContainerElement.style.width = '100%';
            document.body.appendChild(ghostContainerElement);
            this._ghostContainerElement = ghostContainerElement;
        }
    },

    _removeDropIndicator() {
        if (this._dropIndicator) {
            this._dropIndicator.remove();
        }
    },

    _removeGhostContainerElement() {
        if (this.ghostContainerElement) {
            this.ghostContainerElement.remove();
        }
    },

    _addGrabListeners() {
        this._addEventListener('mousedown', this._onMouseDown, {passive: false});
    },

    _removeGrabListeners() {
        this._removeEventListener('mousedown');
    },

    _addMoveListeners() {
        this._addEventListener('mousemove', this._onMouseMove, {passive: false});
    },

    _removeMoveListeners() {
        this._removeEventListener('mousemove');
    },

    _addReleaseListeners() {
        this._addEventListener('mouseup', this._onMouseUp, {passive: false});
    },

    _removeReleaseListeners() {
        this._removeEventListener('mouseup');
    },

    _addKeyDownListeners() {
        this._addEventListener('keydown', this._onKeyDown);
    },

    _removeKeyDownListeners() {
        this._removeEventListener('keydown');
    },

    _addEventListener(e, method, options) {
        if (!this._eventHandlers[e]) {
            let handler = run.bind(this, method);
            this._eventHandlers[e] = {handler, options};
            document.addEventListener(e, handler, options);
        }
    },

    _removeEventListener(e) {
        let event = this._eventHandlers[e];
        if (event) {
            document.removeEventListener(e, event.handler, event.options);
            delete this._eventHandlers[e];
        }
    }

});
