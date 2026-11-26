import React from 'react';

const Group = ({children}: {children: React.ReactNode}) => {
    return (
        <>
            {children}
        </>
    );
};

export interface GroupItem {
    value?: string | null;
}

export interface GroupData<T extends GroupItem = GroupItem> {
    label: string;
    items?: T[];
}

interface KeyboardSelectionWithGroupsProps<T extends GroupItem> {
    groups: GroupData<T>[];
    getItem: (item: T, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => React.ReactNode;
    getGroup: (group: GroupData<T>, opts: {showSpinner?: boolean}) => React.ReactNode;
    onSelect: (item: T) => void;
    onEnterWithoutSelection?: () => void;
    defaultSelected?: T;
    isLoading?: boolean;
}

export function KeyboardSelectionWithGroups<T extends GroupItem>({groups, getItem, getGroup, onSelect, onEnterWithoutSelection, defaultSelected, isLoading}: KeyboardSelectionWithGroupsProps<T>) {
    const items = groups.flatMap(group => group.items ?? []);
    const defaultIndex = Math.max(0, items.findIndex(item => item === defaultSelected));
    const [selectedIndex, setSelectedIndex] = React.useState(defaultIndex);
    const [scrollSelectedIntoView, setScrollSelectedIntoView] = React.useState(false);

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
            setScrollSelectedIntoView(true);
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            setSelectedIndex((i) => {
                return Math.max(i - 1, 0);
            });
            setScrollSelectedIntoView(true);
        }
        if (event.key === 'Enter') {
            const selectedItem = items[selectedIndex];
            if (!selectedItem && !onEnterWithoutSelection) {
                return;
            }

            // The stop propagation is required for Safari
            event.preventDefault();
            event.stopPropagation();

            if (selectedItem) {
                onSelect(selectedItem);
            } else {
                onEnterWithoutSelection?.();
            }
        }
    }, [items, selectedIndex, onSelect, onEnterWithoutSelection]);

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeydown, {capture: true});
        return () => {
            window.removeEventListener('keydown', handleKeydown, {capture: true});
        };
    }, [handleKeydown]);

    return (
        <>
            {groups.map((group, groupIndex) => (
                <Group key={group.label}>
                    {getGroup(group, {showSpinner: groupIndex === 0 && isLoading})}
                    {(group.items || []).map((item, index) => {
                        const itemsBefore = groups.slice(0, groupIndex).reduce((sum, prevGroup) => sum + (prevGroup.items?.length ?? 0), 0);
                        const absoluteIndex = itemsBefore + index;
                        const isSelected = absoluteIndex === selectedIndex && !!item.value;
                        const onMouseOver = () => {
                            if (item.value) {
                                setSelectedIndex(absoluteIndex);
                            }
                            setScrollSelectedIntoView(false);
                        };
                        return getItem(item, isSelected, onMouseOver, scrollSelectedIntoView);
                    })}
                </Group>
            ))}
        </>
    );
}
