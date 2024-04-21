import React from 'react';
import {DropdownContainerCopy} from './DropdownContainerCopy';
import {Input} from './Input';
import {KeyboardSelection} from './KeyboardSelection';

function LoadingItem({dataTestId}) {
    return (
        <li className={`px-4 py-2 text-left`} data-testid={`${dataTestId}-loading`}>
            <span className="block text-sm font-semibold leading-tight text-black dark:text-white">Loading...</span>
        </li>
    );
}

function Item({dataTestId, item, selected, onClick}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100 dark:bg-grey-900';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleMouseDown = (event) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onClick(item);
    };

    return (
        <li className={`${selectionClass} mb-0 cursor-pointer px-4 py-2 text-left hover:bg-grey-100 dark:hover:bg-grey-900`} data-testid={`${dataTestId}-listOption`} onMouseDownCapture={handleMouseDown}>
            <span className="block text-sm font-medium leading-snug text-black dark:text-white" data-testid={`${dataTestId}-listOption-${item.label}`}>{item.label}</span>
        </li>
    );
}

/**
 * Little warning here: this has an onChange handler that doesn't have an event as parameter, but just the value.
 *
 * @param {object} options
 * @param {{value: string, label: string}[]} [options.listOptions]
 * @param {string} [options.list]
 * @returns
 */
export function InputListCopy({autoFocus, className, dataTestId, listOptions, isLoading, value, placeholder, onChange, onSelect}) {
    const [inputFocused, setInputFocused] = React.useState(false);

    const onFocus = () => {
        setInputFocused(true);
    };

    const onBlur = () => {
        setInputFocused(false);
    };

    const getItem = (item, selected) => {
        return (
            <Item key={item.value} dataTestId={dataTestId} item={item} selected={selected} onClick={onSelectEvent}/>
        );
    };

    const onChangeEvent = (event) => {
        onChange(event.target.value);
    };

    const onSelectEvent = (item) => {
        (onSelect || onChange)(item.value);
    };

    const showSuggestions = (isLoading || (listOptions && !!listOptions.length)) && inputFocused;

    return (
        <>
            <div className="relative z-0">
                <Input
                    autoFocus={autoFocus}
                    className={className}
                    dataTestId={dataTestId}
                    placeholder={placeholder}
                    value={value}
                    onBlur={onBlur}
                    onChange={onChangeEvent}
                    onFocus={onFocus}
                />
                {showSuggestions &&
                    <DropdownContainerCopy>
                        {isLoading && <LoadingItem dataTestId={dataTestId}/>}
                        <KeyboardSelection
                            getItem={getItem}
                            items={listOptions}
                            onSelect={onSelectEvent}
                        />
                    </DropdownContainerCopy>
                }
            </div>
        </>
    );
}
