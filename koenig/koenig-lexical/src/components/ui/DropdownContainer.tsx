import React, {useLayoutEffect} from 'react';
import clsx from 'clsx';
import debounce from 'lodash/debounce';

/**
 * Note: when using the DropdownContainer, make sure the input and the dropdown both are in a relative container with a defined z-index (or new stacking context)
 * Make sure the input has a background color, to avoid the shadow of the dropdown showing through
 *
 * Displays the dropdown above or below the parent element, depending on the space available in the viewport.
 * The parent should be positioned relative.
 */
export function DropdownContainer({
    dataTestId,
    className = 'z-[-1] max-h-[30vh] w-full overflow-y-auto bg-white shadow rounded-lg dark:border-grey-800 dark:bg-grey-900',
    placementTopClass = '-top-0.5 -translate-y-full',
    placementBottomClass = 'mt-0.5',
    children,
    ...props
}) {
    const divRef = React.useRef(null);

    const [placement, setPlacement] = React.useState('bottom');

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
        <ul
            ref={divRef}
            className={clsx(
                'absolute',
                placement === 'top' && placementTopClass,
                placement === 'bottom' && placementBottomClass,
                className
            )}
            data-testid={`${dataTestId}-dropdown`}
            {...props}
        >
            {children}
        </ul>
    );
}
