import ArrowIcon from '../../assets/icons/kg-arrow-down.svg?react';
import CloseIcon from '../../assets/icons/kg-close.svg?react';
import React from 'react';
import {DropdownContainer} from './DropdownContainer';
import {KeyboardSelection} from './KeyboardSelection';

function Item({item, selected, onChange}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100 dark:bg-grey-950';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleOptionMouseDown = (event) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onChange(item);
    };

    return (
        <li key={item.name} className={`${selectionClass} !mb-1 hover:bg-grey-100 dark:hover:bg-grey-950`} >
            <button
                className="size-full cursor-pointer px-3 py-1 text-left dark:text-white"
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
    } else if (!filter) {
        prefixItem = getItem({name: '', label: 'Type to search'}, false);
    }

    return (
        <div className="relative z-0 font-sans text-sm font-normal" data-testid={dataTestId}>
            <div
                className={`relative flex w-full cursor-text flex-wrap gap-1 rounded border border-grey-300 bg-white py-2 pl-3 pr-5 text-left font-sans font-normal text-grey-900 focus-within:border-green focus-within:shadow-insetgreen focus-visible:outline-none dark:border-grey-900 dark:bg-grey-900 dark:text-white dark:placeholder:text-grey-800`}
                type="button"
                onClick={() => inputRef.current.focus()}
            >
                {selectedItems.map(item => (
                    <button
                        key={item.name}
                        className="flex cursor-pointer items-center rounded-sm bg-black px-[1rem] py-[.6rem] leading-none text-white dark:bg-grey-100 dark:text-grey-900"
                        data-testid="multiselect-dropdown-selected"
                        type="button"
                        onMouseDownCapture={event => handleDeselect(event, item)}
                    >
                        {item.label}
                        <CloseIcon className="ml-2 mt-[1px] size-2" />
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
                        onFocus={handleOpen}
                        onKeyDown={handleBackspace}
                    />
                </div>

                <ArrowIcon className={`absolute right-2 top-4 size-2 text-grey-600 ${open && 'rotate-180'}`} />
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
