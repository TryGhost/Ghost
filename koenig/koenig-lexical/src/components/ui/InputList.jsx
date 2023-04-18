import React from 'react';
import {DropdownContainer} from './DropdownContainer';
import {Input} from './Input';
import {KeyboardSelection} from './KeyboardSelection';

function Item({dataTestId, item, selected, onChange}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleOptionMouseDown = (event, v) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onChange(v);
    };

    return (
        <li className={`${selectionClass} cursor-pointer px-4 py-2 text-left hover:bg-grey-100 dark:hover:bg-black`} data-testid={`${dataTestId}-listOption`} onMouseDownCapture={event => handleOptionMouseDown(event, item.value)}>
            <span className="block text-sm font-semibold leading-tight text-black dark:text-white" data-testid={`${dataTestId}-listOption-${item.label}`}>{item.label}</span>
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-tight text-grey-700 dark:text-grey-600" data-testid={`${dataTestId}-listOption-${item.value}`}>
                {item.value}
            </span>
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
export function InputList({dataTestId, listOptions, value, placeholder, onChange}) {
    const [inputFocused, setInputFocused] = React.useState(false);

    const onFocus = () => {
        setInputFocused(true);
    };

    const onBlur = () => {
        setInputFocused(false);
    };

    const getItem = (item, selected) => {
        return (
            <Item key={item.value} dataTestId={dataTestId} item={item} selected={selected} onChange={onChange}/>
        );
    };

    const onChangeEvent = (event) => {
        onChange(event.target.value);
    };

    const showSuggestions = listOptions && !!listOptions.length && inputFocused;

    return (
        <>
            <div className="relative">
                <Input
                    dataTestId={dataTestId}
                    placeholder={placeholder}
                    value={value}
                    onBlur={onBlur}
                    onChange={onChangeEvent}
                    onFocus={onFocus}
                />
                {showSuggestions &&
                    <DropdownContainer>
                        <KeyboardSelection
                            getItem={getItem}
                            items={listOptions}
                            onSelect={item => onChange(item.value)}
                        />
                    </DropdownContainer>
                }
            </div>
        </>
    );
}
