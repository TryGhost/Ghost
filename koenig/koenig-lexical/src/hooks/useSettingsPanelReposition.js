import useMovable from './useMovable.js';
import {debounce} from 'lodash';
import {useCallback, useLayoutEffect, useRef} from 'react';

const CARD_SPACING = 20; // default distance between card and settings panel
const MIN_RIGHT_SPACING = 20;
const MIN_TOP_SPACING = 66; // 66 is publish menu and word count size
const MIN_BOTTOM_SPACING = 20;
const MIN_LEFT_SPACING = 20;

function keepWithinSpacing(panelElem, {x, y, topSpacing, bottomSpacing, rightSpacing, leftSpacing, lastSpacing}) {
    if (!panelElem) {
        return {x, y};
    }

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

    const right = x + width;
    const bottom = y + height;

    const topIsOffscreen = y < topSpacing;
    const bottomIsOffscreen = window.innerHeight - bottom < bottomSpacing;
    const rightIsOffscreen = window.innerWidth - right < rightSpacing;
    const leftIsOffscreen = x < leftSpacing;
    let yAdjustment = 0;
    let xAdjustment = 0;

    if (topIsOffscreen && !bottomIsOffscreen) {
        yAdjustment = topSpacing - y;
    }

    if (bottomIsOffscreen && !topIsOffscreen) {
        yAdjustment = -(bottomSpacing - (window.innerHeight - bottom));
    }

    if (rightIsOffscreen) {
        xAdjustment = -(rightSpacing - (window.innerWidth - right));
    }

    if (leftIsOffscreen) {
        xAdjustment = leftSpacing - x;
    }

    // no adjustment needed
    return {x: x + xAdjustment, y: y + yAdjustment};
}

function keepWithinSpacingOnDrag(panelElem, {x, y}) {
    const width = panelElem.offsetWidth;
    const height = panelElem.offsetHeight;

    // Make sure at least 40px is still visible
    const MINIMUM_VISIBLE = 40;
    const topSpacing = MINIMUM_VISIBLE - height;
    const bottomSpacing = MINIMUM_VISIBLE - height;
    const rightSpacing = MINIMUM_VISIBLE - width;
    const leftSpacing = MINIMUM_VISIBLE - width;

    // Last spacing is ignored
    return keepWithinSpacing(panelElem, {x, y, topSpacing, bottomSpacing, rightSpacing, leftSpacing, lastSpacing: undefined});
}

function keepWithinSpacingOnResize(panelElem, {x, y, lastSpacing}) {
    return keepWithinSpacingOnDrag(panelElem, keepWithinSpacing(panelElem, {x, y, topSpacing: MIN_TOP_SPACING, bottomSpacing: MIN_BOTTOM_SPACING, rightSpacing: MIN_RIGHT_SPACING, leftSpacing: MIN_LEFT_SPACING, lastSpacing}));
}

export default function useSettingsPanelReposition({positionToRef} = {}) {
    const {ref, getPosition, setPosition} = useMovable({adjustOnResize: keepWithinSpacingOnResize, adjustOnDrag: keepWithinSpacingOnDrag});
    const previousViewport = useRef({width: window.innerWidth, height: window.innerHeight});

    const getInitialPosition = useCallback((panelElem) => {
        const panelHeight = panelElem.offsetHeight;
        const cardElement = positionToRef || document.querySelector('[data-kg-card-editing="true"]');

        if (!cardElement) {
            return;
        }
        const containerRect = cardElement.getBoundingClientRect();

        // position vertically centered
        // if we already have top set, leave it so that toggling additional settings doesn't cause the panel to jump (unless it would be offscreen)
        const containerMiddle = containerRect.top + (containerRect.height / 2);

        const y = Math.max(containerMiddle - (panelHeight) / 2, MIN_TOP_SPACING);

        // position to right of panel
        const x = containerRect.right + CARD_SPACING;

        return keepWithinSpacingOnResize(panelElem, {x, y});
    }, [positionToRef]);

    const onResize = useCallback((panelElem) => {
        let {x, y, lastSpacing} = getPosition();

        // If the viewport size has increased, move the panel towards the initial position instead of keeping it in the same place
        // This increases the UX when the viewport is too small and the user resizes or rotates the screen -> it will move towards the preferred position so that it is fully visible
        if (window.innerHeight > previousViewport.current.height) {
            const heightIncrease = window.innerHeight - previousViewport.current.height;
            const initialPosition = getInitialPosition(panelElem);
            if (initialPosition) {
                if (initialPosition.y > y) {
                    y += Math.min(initialPosition.y - y, heightIncrease);
                }
            }
        }

        if (window.innerWidth > previousViewport.current.width) {
            const widthIncrease = window.innerWidth - previousViewport.current.width;
            const initialPosition = getInitialPosition(panelElem);
            if (initialPosition) {
                if (initialPosition.x > x) {
                    x += Math.min(initialPosition.x - x, widthIncrease);
                }
            }
        }

        setPosition(keepWithinSpacingOnResize(panelElem, {x, y, lastSpacing}));

        previousViewport.current = {width: window.innerWidth, height: window.innerHeight};
    }, [getInitialPosition, setPosition, getPosition]);

    useLayoutEffect(() => {
        if (!ref) {
            return;
        }

        const panelRepositionDebounced = debounce(() => {
            onResize(ref.current);
        }, 100, {leading: true, trailing: true});
        window.addEventListener('resize', panelRepositionDebounced);

        return () => {
            window.removeEventListener('resize', panelRepositionDebounced);
        };
    }, [onResize, ref]);

    useLayoutEffect(() => {
        if (!ref || !ref.current) {
            return;
        }

        setPosition(getInitialPosition(ref.current));
    }, [getInitialPosition, setPosition, ref]);

    return {
        ref
    };
}
