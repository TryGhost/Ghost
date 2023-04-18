import React, {useLayoutEffect} from 'react';
import {debounce} from 'lodash';

/**
 * Displays the dropdown above or below the parent element, depending on the space available in the viewport.
 * The parent should be positioned relative.
 */
export function DropdownContainer({children}) {
    const divRef = React.useRef(null);

    const [placement, setPlacement] = React.useState('bottom');

    let placementClasses = 'mt-[-1px]';

    if (placement === 'top') {
        placementClasses = 'top-0 -translate-y-full';
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
        <ul ref={divRef} className={`absolute  ${placementClasses} max-h-[30vh] w-full overflow-y-auto rounded-b border border-grey-200 bg-white py-1 shadow dark:border-grey-800 dark:bg-grey-900`}>
            {children}
        </ul>
    );
}
