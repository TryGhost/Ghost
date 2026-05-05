import {useCallback, useRef} from 'react';

/**
 * Subtle 3D tilt effect that follows the cursor.
 *
 * Returns a `cardRef` to attach to the card element, and `containerProps`
 * (mouse handlers) to spread onto the surrounding container that defines
 * the active tracking area.
 *
 * Uses requestAnimationFrame to coalesce mousemove updates into one DOM write
 * per frame, and toggles the transition duration so the card tracks the cursor
 * responsively while moving and eases back smoothly on leave. Safari is more
 * sensitive than Chrome to long transitions overlapping rapid style updates,
 * so without this it feels like the tilt is debounced.
 */
export default function useCardTilt({maxTilt = 3, trackTransition = 'transform 80ms linear', restTransition = 'transform 400ms ease-out'} = {}) {
    const cardRef = useRef(null);
    const rafIdRef = useRef(null);
    const targetRef = useRef({x: 0, y: 0});
    const isHoveringRef = useRef(false);

    const applyFrame = useCallback(() => {
        rafIdRef.current = null;
        const card = cardRef.current;
        if (!card) {
            return;
        }
        if (isHoveringRef.current) {
            const {x, y} = targetRef.current;
            card.style.transition = trackTransition;
            card.style.transform = `perspective(1200px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg)`;
        } else {
            card.style.transition = restTransition;
            card.style.transform = '';
        }
    }, [maxTilt, trackTransition, restTransition]);

    const schedule = useCallback(() => {
        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(applyFrame);
        }
    }, [applyFrame]);

    const onMouseMove = useCallback((event) => {
        const card = cardRef.current;
        if (!card) {
            return;
        }
        const rect = card.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        if (halfWidth === 0 || halfHeight === 0) {
            return;
        }
        targetRef.current = {
            x: (event.clientX - rect.left - halfWidth) / halfWidth,
            y: (event.clientY - rect.top - halfHeight) / halfHeight
        };
        isHoveringRef.current = true;
        schedule();
    }, [schedule]);

    const onMouseLeave = useCallback(() => {
        isHoveringRef.current = false;
        schedule();
    }, [schedule]);

    return {
        cardRef,
        containerProps: {onMouseMove, onMouseLeave}
    };
}
