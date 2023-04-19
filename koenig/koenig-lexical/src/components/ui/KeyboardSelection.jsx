import React from 'react';

/**
 * Renders a list of options, which are selectable by using the up and down arrow keys.
 * You pass in the template for each option via the getItem function, which is called for each option and also passes in whether the item is selected or not.
 *
 * @param {object} options
 * @param {T[]} [options.items]
 * @param {(T, selected) => import('react').ReactElement} [options.getItem]
 */
export function KeyboardSelection({items, getItem, onSelect, defaultSelected}) {
    const defaultIndex = items.findIndex(item => item === defaultSelected);
    const [selectedIndex, setSelectedIndex] = React.useState(defaultIndex === -1 ? 0 : defaultIndex);

    const handleKeydown = React.useCallback((event) => {
        event.preventDefault();

        if (event.key === 'ArrowDown') {
            // The stop propagation is required for Safari
            event.stopPropagation();
            setSelectedIndex((i) => {
                return Math.min(i + 1, items.length - 1);
            });
        }
        if (event.key === 'ArrowUp') {
            // The stop propagation is required for Safari
            event.stopPropagation();
            setSelectedIndex((i) => {
                return Math.max(i - 1, 0);
            });
        }
        if (event.key === 'Enter') {
            // The stop propagation is required for Safari
            event.stopPropagation();
            onSelect(items[selectedIndex]);
        }
    }, [items, selectedIndex, onSelect]);

    React.useEffect(() => {
        // The capture phase is required for Safari
        window.addEventListener('keydown', handleKeydown, {capture: true});
        return () => {
            window.removeEventListener('keydown', handleKeydown, {capture: true});
        };
    }, [handleKeydown]);

    return (
        <>
            {items.map((item, index) => {
                return getItem(item, index === selectedIndex);
            })}
        </>
    );
}
