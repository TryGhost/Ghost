import React, {useLayoutEffect} from 'react';
import {debounce} from 'lodash';

/**
 * Note: when using the DropdownContainer, make sure the input and the dropdown both are in a relative container with a defined z-index (or new stacking context)
 * Make sure the input has a background color, to avoid the shadow of the dropdown showing through
 *
 * Displays the dropdown above or below the parent element, depending on the space available in the viewport.
 * The parent should be positioned relative.
 */
export function DropdownContainer({children}) {
    const divRef = React.useRef(null);

    const [placement, setPlacement] = React.useState('bottom');

    let placementClasses = 'mt-[-2px] rounded-b border-t-0';

    if (placement === 'top') {
        placementClasses = 'top-[2px] -translate-y-full rounded-t border-b-0';
    }

    const updatePlacement = () => {
        if (!divRef || !divRef.current) {
            return;
        }

        // Get the position of divRef on the screen
        const box = divRef.current.parentNode.getBoundingClientRect();
        const bottom = box.bottom;
        const spaceBelow = window.innerHeight - bottom;

        if (spaceBelow < divRef.current.offsetHeight) {
            setPlacement('top');
        } else {
            setPlacement('bottom');
        }
    };

    useLayoutEffect(() => {
        updatePlacement();
    }, []);

    // Add event listeners
    React.useEffect(() => {
        const updatePlacementDebounced = debounce(() => {
            updatePlacement();
        }, 250);

        // For now we don't listen for scroll because all the panels are positioned fixed
        // Can add it here if needed
        window.addEventListener('resize', updatePlacementDebounced, {passive: true});

        return () => {
            window.removeEventListener('resize', updatePlacementDebounced, {passive: true});
        };
    }, []);

    return (
        <ul ref={divRef} className={`absolute ${placementClasses} z-[-1] max-h-[30vh] w-full overflow-y-auto border border-grey-200 bg-white py-1 shadow dark:border-grey-800 dark:bg-grey-900`}>
            {children}
        </ul>
    );
}
