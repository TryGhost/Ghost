import {useRef, useEffect, useCallback} from 'react';

// TODO: this is a temporary fix, replacement for ember's id, need better solution
function guidFor() {
    // create unique id
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0;
        let v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * useMovable
 * @param {Object} options
 * @param {Function} options.adjustOnResize - function called when panel size was changed
 * @returns {Object} ref - a ref that should be attached to the element that should be movable
 *
 * @description
 * useMovable is a hook that allows an element to be moved around the screen by dragging it.
 *
 * @example
 * const {ref} = useMovable();
 */
export default function useMovable({adjustOnResize} = {}) {
    const ref = useRef(null);

    const moveThreshold = 3;

    // Use refs to avoid re-renders, see https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
    let active = useRef(false);
    let currentX = useRef();
    let currentY = useRef();
    let initialX = useRef();
    let initialY = useRef();
    let xOffset = useRef();
    let yOffset = useRef();
    let originalOverflow = useRef();
    let guid = guidFor();

    const cancelClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const setTranslate = useCallback((xPos, yPos) => {
        ref.current.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }, [ref]);

    const disableScroll = useCallback(() => {
        originalOverflow.current = ref.current?.style.overflow;
        ref.current.style.overflow = 'hidden';
    }, [ref]);

    const enableScroll = useCallback(() => {
        ref.current.style.overflow = originalOverflow.current;
    }, [ref]);

    const disableSelection = useCallback(() => {
        window.getSelection().removeAllRanges();

        const stylesheet = document.createElement('style');
        stylesheet.id = `stylesheet-${guid}`;

        document.head.appendChild(stylesheet);

        stylesheet.sheet.insertRule('* { user-select: none !important; }', 0);
    }, [guid]);

    const enableSelection = useCallback(() => {
        const stylesheet = document.getElementById(`stylesheet-${guid}`);
        stylesheet?.remove();
    }, [guid]);

    // disabling pointer events prevents inputs being activated when drag finishes,
    // preventing clicks stops any event handlers that may otherwise result in the
    // movable element being closed when the drag finishes
    const disablePointerEvents = useCallback(() => {
        ref.current.style.pointerEvents = 'none';
        window.addEventListener('click', cancelClick, {capture: true, passive: false});
    }, [ref, cancelClick]);

    const enablePointerEvents = useCallback(() => {
        ref.current.style.pointerEvents = '';
        window.removeEventListener('click', cancelClick, {capture: true, passive: false});
    }, [ref, cancelClick]);

    const drag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        let eventX, eventY;

        if (e.type === 'touchmove') {
            eventX = e.touches[0].clientX;
            eventY = e.touches[0].clientY;
        } else {
            eventX = e.clientX;
            eventY = e.clientY;
        }

        if (!active) {
            if (
                Math.abs(Math.abs(initialX.current - eventX) - Math.abs(xOffset.current)) > moveThreshold ||
                Math.abs(Math.abs(initialY.current - eventY) - Math.abs(yOffset.current)) > moveThreshold
            ) {
                // dropdown.closeDropdowns();
                disableScroll();
                disableSelection();
                disablePointerEvents();
                active.current = true;
            }
        }

        if (active) {
            currentX.current = eventX - initialX.current;
            currentY.current = eventY - initialY.current;
            xOffset.current = currentX.current;
            yOffset.current = currentY.current;

            setTranslate(currentX.current, currentY.current);
        }
    }, [moveThreshold, setTranslate, disableScroll, disableSelection, disablePointerEvents]);

    const dragEnd = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        active.current = false;

        initialX.current = currentX.current;
        initialY.current = currentY.current;

        window.removeEventListener('touchend', dragEnd, {capture: true, passive: false});
        window.removeEventListener('touchmove', drag, {capture: true, passive: false});
        window.removeEventListener('mouseup', dragEnd, {capture: true, passive: false});
        window.removeEventListener('mousemove', drag, {capture: true, passive: false});

        // Removing this immediately results in the click event behind re-enabled in the same
        // event loop meaning that it doesn't have the desired effect when dragging out of the canvas.
        // Putting in the next tick stops the immediate click event firing when finishing drag
        setTimeout(() => {
            window.removeEventListener('click', cancelClick.bind(this), {capture: true, passive: false});
        }, 1);

        enableScroll();
        enableSelection();

        // timeout required so immediate events blocked until the dragEnd has fully realised
        setTimeout(() => {
            enablePointerEvents();
        }, 5);
    }, [enableScroll, enableSelection, enablePointerEvents, drag, cancelClick]);

    const addActiveEventListeners = useCallback(() => {
        window.addEventListener('touchend', dragEnd, {capture: true, passive: false});
        window.addEventListener('touchmove', dragEnd, {capture: true, passive: false});
        window.addEventListener('mouseup', dragEnd, {capture: true, passive: false});
        window.addEventListener('mousemove', drag, {capture: true, passive: false});
    }, [dragEnd, drag]);

    const dragStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'touchstart' || e.button === 0) {
            if (e.type === 'touchstart') {
                initialX.current = e.touches[0].clientX - (xOffset.current || 0);
                initialY.current = e.touches[0].clientY - (yOffset.current || 0);
            } else {
                initialX.current = e.clientX - (xOffset.current || 0);
                initialY.current = e.clientY - (yOffset.current || 0);
            }

            for (const element of (e.path || e.composedPath())) {
                if (element?.matches?.('input, .ember-basic-dropdown-trigger')) {
                    break;
                }

                if (element === ref.current) {
                    addActiveEventListeners();
                    break;
                }
            }
        }
    }, [ref, addActiveEventListeners]);

    const addStartEventListeners = useCallback(() => {
        ref.current?.addEventListener('touchstart', dragStart, false);
        ref.current?.addEventListener('mousedown', dragStart, false);
    }, [ref, dragStart]);

    const removeStartEventListeners = useCallback(() => {
        ref.current?.removeEventListener('touchstart', dragEnd, false);
        ref.current?.removeEventListener('mousedown', dragEnd, false);
    }, [ref, dragEnd]);

    const removeActiveEventListeners = useCallback(() => {
        window.removeEventListener('touchend', dragEnd, {capture: true, passive: false});
        window.removeEventListener('touchmove', drag, {capture: true, passive: false});
        window.removeEventListener('mouseup', dragEnd, {capture: true, passive: false});
        window.removeEventListener('mousemove', drag, {capture: true, passive: false});

        // Removing this immediately results in the click event behind re-enabled in the same
        // event loop meaning that it doesn't have the desired effect when dragging out of the canvas.
        // Putting in the next tick stops the immediate click event firing when finishing drag
        setTimeout(() => {
            window.removeEventListener('click', cancelClick.bind(this), {capture: true, passive: false});
        }, 1);
    }, [dragEnd, drag, cancelClick]);

    const removeEventListeners = useCallback(() => {
        removeStartEventListeners();
        removeActiveEventListeners();
    }, [removeStartEventListeners, removeActiveEventListeners]);

    useEffect(() => {
        const elem = ref.current;
        elem.setAttribute('draggable', true);
        ref.current?.classList.add('kg-card-movable');
        let _resizeObserver;
        addStartEventListeners();

        if (adjustOnResize) {
            _resizeObserver = new ResizeObserver(() => {
                if (currentX.current === undefined || currentY.current === undefined) {
                    return;
                }

                const {x, y} = adjustOnResize(elem, {x: currentX, y: currentY});

                if (x === currentX.current && y === currentY.current) {
                    return;
                }

                currentX.current = x;
                initialX.current = x;
                xOffset.current = x;

                currentY.current = y;
                initialY.current = y;
                yOffset.current = y;

                setTranslate(x, y);
            });
            _resizeObserver.observe(elem);
        }

        // Cleanup event listeners on unmount
        return () => {
            removeEventListeners();
            _resizeObserver?.disconnect();
            enableSelection();
        };
    }, []);

    return {ref};
}
