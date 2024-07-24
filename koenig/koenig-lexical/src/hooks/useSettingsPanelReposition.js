import debounce from 'lodash/debounce';
import useMovable from './useMovable.js';
import {getScrollParent} from '../utils/getScrollParent.js';
import {useCallback, useLayoutEffect, useRef} from 'react';

const CARD_SPACING = 20; // default distance between card and settings panel
const MIN_RIGHT_SPACING = 20;
const MIN_TOP_SPACING = 66; // 66 is publish menu and word count size
const MIN_BOTTOM_SPACING = 20;
const MIN_LEFT_SPACING = 20;

function isMobile() {
    return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

const getSelectedCardOrigin = () => {
    const cardElement = document.querySelector('[data-kg-card-editing="true"]');
    if (!cardElement) {
        return {x: 0, y: 0};
    }
    const containerRect = cardElement.getBoundingClientRect();

    // if the card element has a transform applied (e.g. wide cards) our panel elem becomes positioned
    // relative to the card element rather than the window
    const cardStyles = window.getComputedStyle(cardElement);
    const origin = {x: 0, y: 0};
    if (cardStyles.transform !== 'none') {
        origin.x = containerRect.left;
        origin.y = containerRect.top;
    }
    return origin;
};

function getWindowWidthAdjustment(panelElem) {
    if (!panelElem) {
        return 0;
    }

    return parseInt(window.getComputedStyle(panelElem).getPropertyValue('--kg-breakout-adjustment') || 0, 10);
}

function getViewportDimensions(panelElem) {
    const windowWidthAdjustment = getWindowWidthAdjustment(panelElem);

    return {
        width: window.innerWidth - windowWidthAdjustment,
        height: window.innerHeight
    };
}

function keepWithinSpacing(panelElem, {x, y, origin = {x: 0, y: 0}, topSpacing, bottomSpacing, rightSpacing, leftSpacing, lastSpacing}) {
    origin = getSelectedCardOrigin();

    if (!panelElem) {
        return {x: x + origin.x, y: y + origin.y};
    }

    const windowWidthAdjustment = getWindowWidthAdjustment(panelElem);

    // Take previous position into account, and adjust the spacing to allow negative spacing if the previous position was offscreen
    if (lastSpacing && lastSpacing.top < topSpacing) {
        topSpacing = lastSpacing.top;
    }
    if (lastSpacing && lastSpacing.bottom < bottomSpacing) {
        bottomSpacing = lastSpacing.bottom;
    }
    if (lastSpacing && lastSpacing.right < rightSpacing) {
        rightSpacing = lastSpacing.right;
    }
    if (lastSpacing && lastSpacing.left < leftSpacing) {
        leftSpacing = lastSpacing.left;
    }

    const width = panelElem.offsetWidth;
    const height = panelElem.offsetHeight;

    const right = x + width + origin.x;
    const bottom = y + height + origin.y;

    const topIsOffscreen = (y + origin.y) < topSpacing;
    const bottomIsOffscreen = window.innerHeight - bottom < bottomSpacing;
    const rightIsOffscreen = window.innerWidth - right - windowWidthAdjustment < rightSpacing;
    const leftIsOffscreen = x < leftSpacing;
    let yAdjustment = 0;
    let xAdjustment = 0;

    if (topIsOffscreen && !bottomIsOffscreen) {
        yAdjustment = topSpacing - y - origin.y;
    }

    if (bottomIsOffscreen && !topIsOffscreen) {
        yAdjustment = -(bottomSpacing - (window.innerHeight - bottom));
    }

    if (rightIsOffscreen) {
        xAdjustment = -(rightSpacing - (window.innerWidth - right - windowWidthAdjustment));
    }

    if (leftIsOffscreen) {
        xAdjustment = leftSpacing - x - origin.x;
    }

    return {x: x + xAdjustment, y: y + yAdjustment};
}

function keepWithinSpacingOnDrag(panelElem, {x, y, origin}) {
    const DISTANCE_FROM_BOUNDARY = 10;

    const topSpacing = DISTANCE_FROM_BOUNDARY;
    const bottomSpacing = DISTANCE_FROM_BOUNDARY;
    const rightSpacing = DISTANCE_FROM_BOUNDARY;
    const leftSpacing = DISTANCE_FROM_BOUNDARY;

    // Last spacing is ignored
    return keepWithinSpacing(panelElem, {x, y, origin, topSpacing, bottomSpacing, rightSpacing, leftSpacing, lastSpacing: undefined});
}

function keepWithinSpacingOnResize(panelElem, {x, y, origin, lastSpacing}) {
    return keepWithinSpacingOnDrag(panelElem, keepWithinSpacing(panelElem, {x, y, origin, topSpacing: MIN_TOP_SPACING, bottomSpacing: MIN_BOTTOM_SPACING, rightSpacing: MIN_RIGHT_SPACING, leftSpacing: MIN_LEFT_SPACING, lastSpacing}));
}

export default function useSettingsPanelReposition({positionToRef} = {}, cardWidth) {
    const {ref, getPosition, setPosition} = useMovable({adjustOnResize: keepWithinSpacingOnResize, adjustOnDrag: keepWithinSpacingOnDrag});
    const previousViewport = useRef(getViewportDimensions(ref.current));
    const previousCardWidth = useRef(cardWidth);
    const previousCardOrigin = useRef({x: 0, y: 0});

    const getInitialPosition = useCallback((panelElem) => {
        const panelHeight = panelElem.offsetHeight;
        const cardElement = positionToRef ||
                    document.querySelector('[data-kg-card-editing="true"]') ||
                    document.querySelector('[data-kg-card-selected="true"]');
        if (!cardElement) {
            return;
        }
        const containerRect = cardElement.getBoundingClientRect();

        if (isMobile()) {
            // Mobile behaviour: position below card
            const x = window.innerWidth / 2 - panelElem.offsetWidth / 2;
            const y = containerRect.bottom + CARD_SPACING;
            return keepWithinSpacingOnDrag(panelElem, {x, y});
        }

        // We correct the height of the container to the height of the container that is on screen, then the positioning is better
        const visibleHeight = Math.min(window.innerHeight, containerRect.bottom) - containerRect.top;

        // position vertically centered
        // if we already have top set, leave it so that toggling additional settings doesn't cause the panel to jump (unless it would be offscreen)
        const containerMiddle = containerRect.top + (visibleHeight / 2);

        let y = containerMiddle - (panelHeight) / 2;

        // position to right of panel
        let x = containerRect.right + CARD_SPACING;

        // if the card element has a transform applied (e.g. wide cards) our panel elem becomes positioned
        // relative to the card element rather than the window
        const cardStyles = window.getComputedStyle(cardElement);
        const origin = {x: 0, y: 0};
        if (cardStyles.transform !== 'none') {
            origin.x = containerRect.left;
            origin.y = containerRect.top;
        }

        return keepWithinSpacingOnResize(panelElem, {x, y, origin});
    }, [positionToRef]);

    const onResize = useCallback((panelElem) => {
        let {x, y, lastSpacing} = getPosition();

        const viewport = getViewportDimensions(panelElem);

        // If the viewport size has increased, move the panel towards the initial position instead of keeping it in the same place
        // This increases the UX when the viewport is too small and the user resizes or rotates the screen -> it will move towards the preferred position so that it is fully visible
        if (viewport.height > previousViewport.current.height) {
            const heightIncrease = viewport.height - previousViewport.current.height;
            const initialPosition = getInitialPosition(panelElem);
            if (initialPosition) {
                if (initialPosition.y > y) {
                    y += Math.min(initialPosition.y - y, heightIncrease);
                }
            }
        }

        if (viewport.width > previousViewport.current.width) {
            const widthIncrease = viewport.width - previousViewport.current.width;
            const initialPosition = getInitialPosition(panelElem);
            if (initialPosition) {
                if (initialPosition.x > x) {
                    x += Math.min(initialPosition.x - x, widthIncrease);
                }
            }
        }

        setPosition(keepWithinSpacingOnResize(panelElem, {x, y, lastSpacing}));

        previousViewport.current = viewport;
    }, [getInitialPosition, setPosition, getPosition]);

    // reposition on scroll container resize, covers two cases:
    // 1. window is resized
    // 2. sidebar is opened/closed
    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }

        const container = getScrollParent(ref.current) || document.body;
        let prevWidth = 0;

        const panelRepositionDebounced = debounce((newWidth) => {
            prevWidth = newWidth;
            onResize(ref.current);
        }, 100, {leading: true, trailing: true});

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentBoxSize?.[0]) {
                    const width = entry.contentBoxSize[0].inlineSize;
                    if (typeof width === 'number' && width !== prevWidth) {
                        panelRepositionDebounced(width);
                    }
                }
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [onResize, ref]);

    // position on first render
    useLayoutEffect(() => {
        if (!ref || !ref.current) {
            return;
        }
        try {
            setPosition(getInitialPosition(ref.current));
        } catch (e) {
            console.error(e); // eslint-disable-line no-console
        }
    }, [getInitialPosition, setPosition, ref]);

    // account for wide cards using a transform so we need to adjust the origin position
    //  NOTE: we want to make sure this doesn't happen on the first render so previousCardWidth must start as undefined
    useLayoutEffect(() => {
        if (cardWidth === 'wide' && previousCardWidth.current !== 'wide') {
            // offset origin to account for wide card (origin = card origin)
            const cardElement = document.querySelector('[data-kg-card-editing="true"]');
            if (!cardElement) {
                return;
            }
            const containerRect = cardElement.getBoundingClientRect();
            const origin = {x: containerRect.left + 2, y: containerRect.top + 1}; // not sure why 2,1 offsets mild bounce in positioning
            previousCardOrigin.current = origin;

            const x = getPosition().x - origin.x;
            const y = getPosition().y - origin.y;
            setPosition(keepWithinSpacingOnResize(ref.current, {x, y, origin}));
        } else if (previousCardWidth.current === 'wide' && cardWidth !== 'wide') {
            // reset origin to window origin
            const x = getPosition().x + previousCardOrigin.current.x;
            const y = getPosition().y + previousCardOrigin.current.y;
            setPosition(keepWithinSpacingOnResize(ref.current, {x, y, origin: {x: 0, y: 0}}));
        }
        previousCardWidth.current = cardWidth;
    }, [cardWidth, getPosition, getInitialPosition, setPosition, ref]);

    return {ref};
}
