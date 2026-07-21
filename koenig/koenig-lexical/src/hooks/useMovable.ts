import {useCallback, useEffect, useRef} from 'react';

// TODO: this is a temporary fix, replacement for ember's id, need better solution
function guidFor(): string {
    // create unique id
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
}

export interface Position {
    x: number;
    y: number;
    lastSpacing?: Spacing;
}

export interface Spacing {
    top: number;
    left: number;
    right: number;
    bottom: number;
}

export interface UseMovableOptions {
    adjustOnResize?: (elem: HTMLElement, position: Position) => Position;
    adjustOnDrag?: (elem: HTMLElement, position: Position) => Position;
}

/**
 * useMovable
 * useMovable is a hook that allows an element to be moved around the screen by dragging it.
 */
export default function useMovable({adjustOnResize, adjustOnDrag}: UseMovableOptions = {}) {
    const ref = useRef<HTMLElement | null>(null);

    const moveThreshold = 3;

    // Use refs to avoid re-renders, see https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
    const active = useRef(false);
    const currentX = useRef<number | undefined>();
    const currentY = useRef<number | undefined>();

    const offsetX = useRef<number>(0);
    const offsetY = useRef<number>(0);

    // Keep track of spacing, so we can allow negative spacing when resizing if the user placed the window outside the canvas
    // Contains an object with top, left, right and bottom spacing between the panel and the viewport
    const lastSpacing = useRef<Spacing | undefined>();
    const originalOverflow = useRef<string | undefined>();
    const guid = guidFor();

    // React event handlers get added to the root element, so if we add listeners to the ref directly
    // and call stopPropagation they stop any React events on child nodes from firing.
    // Instead we add the listeners to the body and check if the event target is the ref.
    const addRefEventListener = (event: string, handler: (e: Event) => void) => {
        const listener = (e: Event) => {
            if (ref.current?.contains(e.target as Node)) {
                handler(e);
            }
        };

        document.body.addEventListener(event, listener, false);

        return listener;
    };

    const cancelClick = useCallback((e: Event) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const setTranslate = useCallback((xPos: number, yPos: number) => {
        ref.current!.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }, [ref]);

    const setPosition = useCallback(({x, y}: Position) => {
        currentX.current = x;
        currentY.current = y;

        const width = ref.current!.offsetWidth;
        const height = ref.current!.offsetHeight;

        // Update spacing
        const spacing: Spacing = {
            top: y,
            left: x,
            right: window.innerWidth - x - width,
            bottom: window.innerHeight - y - height
        };
        lastSpacing.current = spacing;

        setTranslate(x, y);
    }, [setTranslate]);

    const getPosition = useCallback(() => {
        return {
            x: currentX.current!,
            y: currentY.current!,
            lastSpacing: lastSpacing.current
        };
    }, []);

    const disableScroll = useCallback(() => {
        originalOverflow.current = ref.current?.style.overflow;
        ref.current!.style.overflow = 'hidden';
    }, [ref]);

    const enableScroll = useCallback(() => {
        ref.current!.style.overflow = originalOverflow.current || '';
    }, [ref]);

    const disableSelection = useCallback(() => {
        window.getSelection()?.removeAllRanges();

        const stylesheet = document.createElement('style');
        stylesheet.id = `stylesheet-${guid}`;

        document.head.appendChild(stylesheet);

        stylesheet.sheet!.insertRule('* { user-select: none !important; }', 0);
    }, [guid]);

    const enableSelection = useCallback(() => {
        const stylesheet = document.getElementById(`stylesheet-${guid}`);
        stylesheet?.remove();
    }, [guid]);

    // disabling pointer events prevents inputs being activated when drag finishes,
    // preventing clicks stops any event handlers that may otherwise result in the
    // movable element being closed when the drag finishes
    const disablePointerEvents = useCallback(() => {
        if (ref.current) {
            ref.current.style.pointerEvents = 'none';
        }
        window.addEventListener('click', cancelClick, {capture: true, passive: false});
    }, [ref, cancelClick]);

    const enablePointerEvents = useCallback(() => {
        if (ref.current) {
            ref.current.style.pointerEvents = '';
        }
        window.removeEventListener('click', cancelClick, {capture: true});
    }, [ref, cancelClick]);

    const drag = useCallback((e: Event) => {
        let eventX: number, eventY: number;

        if ((e as TouchEvent).type === 'touchmove') {
            eventX = (e as TouchEvent).touches[0].clientX;
            eventY = (e as TouchEvent).touches[0].clientY;
        } else {
            eventX = (e as MouseEvent).clientX;
            eventY = (e as MouseEvent).clientY;
        }

        if (!active.current) {
            if (
                Math.abs(eventX - offsetX.current - (currentX.current || 0)) > moveThreshold ||
                Math.abs(eventY - offsetY.current - (currentY.current || 0)) > moveThreshold
            ) {
                disableScroll();
                disableSelection();
                disablePointerEvents();
                active.current = true;
            }
        }

        if (active.current) {
            let position: Position = {
                x: eventX - offsetX.current,
                y: eventY - offsetY.current
            };

            if (adjustOnDrag) {
                position = adjustOnDrag(ref.current!, {...position, lastSpacing: lastSpacing.current});
            }

            setPosition(position);
        }
    }, [moveThreshold, setPosition, disableScroll, disableSelection, disablePointerEvents, adjustOnDrag]);

    const dragEnd = useCallback(() => {
        active.current = false;

        window.removeEventListener('touchend', dragEnd, {capture: true});
        window.removeEventListener('touchmove', drag, {capture: true});
        window.removeEventListener('mouseup', dragEnd, {capture: true});
        window.removeEventListener('mousemove', drag, {capture: true});

        // Removing this immediately results in the click event being re-enabled in the same
        // event loop meaning that it doesn't have the desired effect when dragging out of the canvas.
        // Putting in the next tick stops the immediate click event firing when finishing drag
        setTimeout(() => {
            window.removeEventListener('click', cancelClick, {capture: true});
        }, 1);

        enableScroll();
        enableSelection();

        // timeout required so immediate events blocked until the dragEnd has fully realised
        setTimeout(() => {
            enablePointerEvents();
        }, 5);
    }, [enableScroll, enableSelection, enablePointerEvents, drag, cancelClick]);

    const addActiveEventListeners = useCallback(() => {
        window.addEventListener('touchend', dragEnd, {capture: true, passive: true});
        window.addEventListener('touchmove', drag, {capture: true, passive: true});
        window.addEventListener('mouseup', dragEnd, {capture: true, passive: true});
        window.addEventListener('mousemove', drag, {capture: true, passive: true});
    }, [dragEnd, drag]);

    const dragStart = useCallback((e: Event) => {
        e.stopPropagation();
        active.current = false;

        const mouseEvent = e as MouseEvent;
        const touchEvent = e as TouchEvent;

        if (e.type === 'touchstart' || mouseEvent.button === 0) {
            if (e.type === 'touchstart') {
                offsetX.current = touchEvent.touches[0].clientX - (currentX.current || 0);
                offsetY.current = touchEvent.touches[0].clientY - (currentY.current || 0);
            } else {
                offsetX.current = mouseEvent.clientX - (currentX.current || 0);
                offsetY.current = mouseEvent.clientY - (currentY.current || 0);
            }

            for (const element of ((e as unknown as {path?: EventTarget[]}).path || e.composedPath())) {
                if ((element as HTMLElement)?.matches?.('input, .ember-basic-dropdown-trigger')) {
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
        const touchStartListener = addRefEventListener('touchstart', dragStart);
        const mouseDownListener = addRefEventListener('mousedown', dragStart);

        return () => {
            document.body.removeEventListener('touchstart', touchStartListener);
            document.body.removeEventListener('mousedown', mouseDownListener);
        };
    }, [dragStart]);

    const removeActiveEventListeners = useCallback(() => {
        window.removeEventListener('touchend', dragEnd, {capture: true});
        window.removeEventListener('touchmove', drag, {capture: true});
        window.removeEventListener('mouseup', dragEnd, {capture: true});
        window.removeEventListener('mousemove', drag, {capture: true});

        // Removing this immediately results in the click event being re-enabled in the same
        // event loop meaning that it doesn't have the desired effect when dragging out of the canvas.
        // Putting in the next tick stops the immediate click event firing when finishing drag
        setTimeout(() => {
            window.removeEventListener('click', cancelClick, {capture: true});
        }, 1);
    }, [dragEnd, drag, cancelClick]);

    useEffect(() => {
        const elem = ref.current!;
        elem.setAttribute('draggable', 'true');
        ref.current?.classList.add('kg-card-movable');
        let _resizeObserver: ResizeObserver | undefined;
        const removeStartEventListeners = addStartEventListeners();

        if (adjustOnResize) {
            _resizeObserver = new ResizeObserver(() => {
                if (currentX.current === undefined || currentY.current === undefined) {
                    return;
                }

                const position = adjustOnResize(elem, {x: currentX.current, y: currentY.current, lastSpacing: lastSpacing.current});

                if (position.x !== currentX.current || position.y !== currentY.current) {
                    // Adjust offsetX and offsetY to account for the difference in position moved
                    // This is to make sure we don't jump drag position if the element is resized just after touch start
                    // Say you start dragging on a button that opens a collapsible section, if the section is resized -> this fixes glitches
                    offsetX.current = offsetX.current - (position.x - currentX.current);
                    offsetY.current = offsetY.current - (position.y - currentY.current);
                    setPosition(position);
                }
            });
            _resizeObserver.observe(elem);
        }

        // Cleanup event listeners on unmount
        return () => {
            removeStartEventListeners();
            removeActiveEventListeners();
            _resizeObserver?.disconnect();
            enableSelection();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {ref, setPosition, getPosition};
}
