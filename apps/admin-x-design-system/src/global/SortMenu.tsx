import React, {useState, useEffect} from 'react';
import Button, {ButtonProps} from './Button';
import Popover, {PopoverPosition} from './Popover';
import {Icon} from '..';

export type SortDirection = 'asc' | 'desc';

export type SortItem = {
    id: string,
    label: string;
    selected?: boolean;
    direction?: SortDirection;
}

export interface SortMenuProps {
    items: SortItem[];
    direction: SortDirection;
    onSortChange: (selectedOption: string) => void;
    onDirectionChange: (selectedDirection: string) => void;
    trigger?: React.ReactNode;
    triggerButtonProps?: ButtonProps;
    position?: PopoverPosition;
}

const SortMenu: React.FC<SortMenuProps> = ({
    items,
    direction,
    onSortChange,
    onDirectionChange,
    trigger,
    triggerButtonProps,
    position = 'start'
}) => {
    const [localItems, setLocalItems] = useState<SortItem[]>(items);
    const [localDirection, setLocalDirection] = useState<SortDirection>(direction || 'desc');

    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const handleSortChange = (selectedValue: string) => {
        const updatedItems = localItems.map(item => ({
            ...item,
            selected: item.id === selectedValue ? true : false
        }));
        setLocalItems(updatedItems);

        if (localItems.find(item => item.id === selectedValue)?.direction) {
            setLocalDirection(localItems.find(item => item.id === selectedValue)?.direction || 'desc');
            onDirectionChange(localDirection);
        }

        onSortChange(selectedValue);
    };

    const handleSortDirection = (e?: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e?.stopPropagation();
        setLocalDirection(currentDirection => (currentDirection === 'desc' ? 'asc' : 'desc'));
        onDirectionChange(localDirection);
    };

    if (!trigger) {
        trigger = <Button className='flex-row-reverse' icon={`${localDirection === 'asc' ? 'arrow-up' : 'arrow-down'}`} iconColorClass='!w-3 !h-3 !mr-0 ml-1.5' label={`${localItems.find(item => item.selected)?.label}`} {...triggerButtonProps} />;
    }

    return (
        <Popover position={position} trigger={trigger}>
            <div className='flex flex-col'>
                <div className='cursor-default select-none border-b border-b-grey-200 p-2 pl-3 text-sm font-semibold dark:border-b-grey-800'>Sort by</div>
                <div className="flex min-w-[160px] flex-col justify-stretch py-1" role="none">
                    {localItems.map(item => (
                        <button key={item.id} className="group relative mx-1 flex grow cursor-pointer items-center rounded-[2.5px] px-8 py-1.5 pr-12 text-left text-sm hover:bg-grey-100 dark:hover:bg-grey-800" type="button" onClick={() => {
                            handleSortChange(item.id);
                        }}>
                            {item.selected ? <Icon className='absolute left-2' name='check' size='xs' /> : null}
                            {item.label}
                            {item.selected ? <button className='absolute right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-grey-300 dark:hover:bg-grey-700' title={`${localDirection === 'asc' ? 'Ascending' : 'Descending'}`} type='button' onClick={handleSortDirection}>
                                {localDirection === 'asc' ? <Icon name='arrow-up' size='xs' /> : <Icon name='arrow-down' size='xs' />}
                            </button> : null}
                        </button>
                    ))}
                </div>
            </div>
        </Popover>
    );
};

export default SortMenu;
