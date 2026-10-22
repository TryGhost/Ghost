import React from 'react';

interface KeyboardSelectionProps<T> {
    items: T[];
    getItem: (item: T, selected: boolean, onMouseOver?: () => void, scrollIntoView?: boolean) => React.ReactNode;
    onSelect: (item: T) => void;
    defaultSelected?: T;
}

export function KeyboardSelection<T>({items, getItem, onSelect, defaultSelected}: KeyboardSelectionProps<T>) {
    const defaultIndex = Math.max(0, items.findIndex(item => item === defaultSelected));
    const [selectedIndex, setSelectedIndex] = React.useState(defaultIndex);

    React.useEffect(() => {
        if (selectedIndex >= items.length) {
            setSelectedIndex(defaultIndex);
        }
    }, [items, selectedIndex, defaultIndex]);

    React.useEffect(() => {
        setSelectedIndex(defaultIndex);
    }, [defaultIndex]);

    const handleKeydown = React.useCallback((event: KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            setSelectedIndex((i) => {
                return Math.min(i + 1, items.length - 1);
            });
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            setSelectedIndex((i) => {
                return Math.max(i - 1, 0);
            });
        }
        if (event.key === 'Enter') {
            const selectedItem = items[selectedIndex];
            if (!selectedItem) {
                return;
            }

            // The stop propagation is required for Safari
            event.preventDefault();
            event.stopPropagation();
            onSelect(selectedItem);
        }
    }, [items, selectedIndex, onSelect]);

    React.useEffect(() => {
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
