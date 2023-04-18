import React from 'react';

/**
 * Renders a list of options, which are selectable by using the up and down arrow keys.
 * You pass in the template for each option via the getItem function, which is called for each option and also passes in whether the item is selected or not.
 *
 * @param {object} options
 * @param {T[]} [options.items]
 * @param {(T, selected) => import('react').ReactElement} [options.getItem]
 */
export function KeyboardSelection({items, getItem, onSelect}) {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const handleKeydown = React.useCallback((event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((i) => {
                return Math.min(i + 1, items.length - 1);
            });
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((i) => {
                return Math.max(i - 1, 0);
            });
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            onSelect(items[selectedIndex]);
        }
    }, [items, selectedIndex, onSelect, setSelectedIndex]);

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    return (
        <>
            {items.map((item, index) => {
                return getItem(item, index === selectedIndex);
            })}
        </>
    );
}
