import ArrowIcon from '../../assets/icons/kg-arrow-down.svg?react';
import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import {DropdownContainer} from './DropdownContainer';
import {KeyboardSelection} from './KeyboardSelection';

function Item({item, selected, onChange}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100 dark:bg-grey-900';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleOptionMouseDown = (event) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onChange(item);
    };

    return (
        <li key={item.name} className={`${selectionClass} m-0 hover:bg-grey-100 dark:hover:bg-grey-900`} >
            <button
                className="size-full cursor-pointer px-3 py-[7px] text-left dark:text-white"
                data-testid="multiselect-dropdown-item"
                type="button"
                onMouseDownCapture={handleOptionMouseDown}
            >
                {item.label}
            </button>
        </li>
    );
}

export function MultiSelectDropdown({placeholder = '', items = [], availableItems = [], onChange, dataTestId, allowAdd = true}) {
    const [open, setOpen] = React.useState(false);
    const [filter, setFilter] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const inputRef = React.useRef(null);

    const handleOpen = (event) => {
        setOpen(!open);

        // For Safari, we need to manually focus the button (doesn't happen by default)
        if (!open) {
            event.target.focus();
        }
    };

    const handleBlur = () => {
        setOpen(false);
        setFilter('');
        setIsFocused(false);
    };

    const handleFocus = () => {
        setIsFocused(true);
        handleOpen();
    };

    const handleSelect = (item) => {
        if (!item.name || items?.includes(item.name)) {
            return;
        }

        onChange(items.concat(item.name));
        setFilter('');
    };

    const handleDeselect = (event, selectedItem) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        event.stopPropagation();

        onChange(items.filter(selection => selection !== selectedItem.name));
    };

    const handleBackspace = (event) => {
        if (event.key === 'Backspace' && !filter) {
            onChange(items.slice(0, -1));
        }
    };

    const getItem = (item, selected) => {
        return (
            <Item key={item.name} item={item} selected={selected} onChange={handleSelect}/>
        );
    };

    const selectedItems = items.map(item => ({name: item, label: item}));
    const nonSelectedItems = availableItems.map(item => ({name: item, label: item})).filter(
        ai => !selectedItems.some(ii => ii.name === ai.name)
    );

    const filteredItems = nonSelectedItems.filter(item => item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
    let prefixItem = '';
    const defaultSelected = filteredItems[0];

    if (filter && allowAdd) {
        // Check if we don't have an exact match
        const exactMatch = items.find(item => item.toLocaleLowerCase() === filter.toLocaleLowerCase()) || availableItems.find(item => item.toLocaleLowerCase() === filter.toLocaleLowerCase());
        if (!exactMatch) {
            filteredItems.unshift({name: filter, label: <>Add <strong>&quot;{filter}&quot;...</strong></>});
        }
    }

    return (
        <div className="relative z-0 font-sans text-sm font-normal" data-testid={dataTestId}>
            <div
                className={`relative flex w-full cursor-text flex-wrap gap-1 rounded-lg border ${isFocused ? 'border-green bg-white shadow-[0_0_0_2px_rgba(48,207,67,.25)] dark:bg-grey-925' : 'border-grey-100 bg-grey-100 dark:border-transparent dark:bg-grey-900 dark:hover:bg-grey-925'} px-[10px] py-2 pr-5 font-sans text-sm font-normal leading-[1.5] text-grey-900 placeholder:text-grey-500 focus-visible:outline-none dark:text-white dark:selection:bg-grey-800 dark:placeholder:text-grey-700`}
                type="button"
                onClick={() => inputRef.current.focus()}
            >
                {selectedItems.map(item => (
                    <button
                        key={item.name}
                        className="flex cursor-pointer items-center gap-1.5 rounded bg-black py-px pl-2 pr-1 leading-[1.5] text-white dark:bg-grey-100 dark:text-grey-900"
                        data-testid="multiselect-dropdown-selected"
                        type="button"
                        onMouseDownCapture={event => handleDeselect(event, item)}
                    >
                        {item.label}
                        <CloseIcon className="mt-px size-[1rem] stroke-[3]" />
                    </button>
                ))}

                <div className="flex-1">
                    <input
                        ref={inputRef}
                        className="size-full min-w-[5rem] appearance-none bg-transparent px-0 leading-none outline-none"
                        placeholder={selectedItems.length === 0 ? placeholder : ''}
                        value={filter}
                        onBlur={handleBlur}
                        onChange={event => setFilter(event.target.value)}
                        onFocus={handleFocus}
                        onKeyDown={handleBackspace}
                    />
                </div>

                <ArrowIcon className={`absolute right-3 top-4 size-2 text-grey-900 ${open && 'rotate-180'}`} />
            </div>
            {open && !!filteredItems.length && (
                <DropdownContainer>
                    {prefixItem}
                    <KeyboardSelection
                        defaultSelected={defaultSelected}
                        getItem={getItem}
                        items={filteredItems}
                        onSelect={handleSelect}
                    />
                </DropdownContainer>
            )}
        </div>
    );
}
