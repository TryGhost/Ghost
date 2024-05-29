import React, {useLayoutEffect} from 'react';
import debounce from 'lodash/debounce';

/**
 * Note: when using the DropdownContainer, make sure the input and the dropdown both are in a relative container with a defined z-index (or new stacking context)
 * Make sure the input has a background color, to avoid the shadow of the dropdown showing through
 *
 * Displays the dropdown above or below the parent element, depending on the space available in the viewport.
 * The parent should be positioned relative.
 */
export function DropdownContainerCopy({dataTestId, children, ...props}) {
    const divRef = React.useRef(null);

    const [placement, setPlacement] = React.useState('bottom');

    let placementClasses = 'mt-[.6rem] rounded-md';

    if (placement === 'top') {
        placementClasses = 'top-[-.6rem] -translate-y-full rounded-md';
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
        <ul ref={divRef} className={`absolute ${placementClasses} z-[-1] max-h-[30vh] w-full overflow-y-auto bg-white px-2 py-1 shadow-md dark:bg-grey-950`} data-testid={`${dataTestId}-dropdown`} {...props}>
            {children}
        </ul>
    );
}
