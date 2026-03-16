import ArrowIcon from '../../assets/icons/kg-arrow-down.svg?react';
import React from 'react';
import {DropdownContainer} from './DropdownContainer';
import {KeyboardSelection} from './KeyboardSelection';

interface DropdownItem {
    name: string;
    label: string;
}

function Item({item, selected, onChange}: {item: DropdownItem; selected: boolean; onChange: (name: string) => void}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100 dark:bg-grey-950';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleOptionMouseDown = (event: React.MouseEvent, v: string) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onChange(v);
    };

    return (
        <li key={item.name} className={`${selectionClass} m-0 hover:bg-grey-100 dark:hover:bg-grey-950`}>
            <button className="size-full cursor-pointer px-3 py-[7px] text-left dark:text-white" data-test-value={item.name} type="button" onMouseDownCapture={event => handleOptionMouseDown(event, item.name)}>{item.label}</button>
        </li>
    );
}

export interface DropdownProps {
    value?: string;
    menu: DropdownItem[];
    onChange: (name: string) => void;
    dataTestId?: string;
}

export function Dropdown({value, menu, onChange, dataTestId}: DropdownProps) {
    const [open, setOpen] = React.useState(false);

    const handleOpen = (event: React.MouseEvent) => {
        setOpen(!open);

        // For Safari, we need to manually focus the button (doesn't happen by default)
        if (!open && event.target instanceof HTMLElement) {
            event.target.focus();
        }
    };

    const preventLoseFocus = (event: React.MouseEvent) => {
        // Prevent losing focus when clicking the dropdown
        // needed on Safari
        event.preventDefault();
        event.stopPropagation();
    };

    const handleBlur = () => {
        setOpen(false);
    };

    const handleSelect = (name: string) => {
        setOpen(false);
        onChange(name);
    };

    const getItem = (item: DropdownItem, selected: boolean) => {
        return (
            <Item key={item.name} item={item} selected={selected} onChange={handleSelect}/>
        );
    };

    const selectedItem = menu.find(menuItem => menuItem.name === value);
    const trigger = selectedItem?.label ?? '';
    const zIndex = open ? 'z-10' : 'z-0';

    return (
        <div className={`relative ${zIndex} font-sans text-sm font-normal`} data-testid={dataTestId}>
            <button
                className="relative h-9 w-full cursor-pointer rounded-lg border border-grey-150 bg-grey-150 px-3 py-1 pr-5 text-left font-sans font-normal leading-[1.5] text-grey-900 hover:border-grey-100 hover:bg-grey-100 focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800 md:h-[38px] md:py-2"
                data-testid={`${dataTestId}-value`}
                type="button"
                onBlur={handleBlur}
                onClick={handleOpen}
                onMouseDownCapture={preventLoseFocus}
            >
                {trigger}
                <ArrowIcon className={`absolute right-3 top-[1.5rem] size-2 text-grey-900 ${open && 'rotate-180'}`} />
            </button>
            {open && (
                <DropdownContainer>
                    <KeyboardSelection<DropdownItem>
                        defaultSelected={selectedItem}
                        getItem={getItem}
                        items={menu}
                        onSelect={item => handleSelect(item.name)}
                    />
                </DropdownContainer>
            )}
        </div>

    );
}
