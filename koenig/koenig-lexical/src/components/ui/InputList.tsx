import React from 'react';
import {Delayed} from './Delayed';
import {DropdownContainer} from './DropdownContainer';
import {Input} from './Input';
import {KeyboardSelection} from './KeyboardSelection';
import {KeyboardSelectionWithGroups} from './KeyboardSelectionWithGroups';
import {Spinner} from './Spinner';

export function InputListLoadingItem({dataTestId}) {
    return (
        <Delayed>
            <li className={`mb-0 px-4 py-2 text-left`} data-testid={`${dataTestId}-loading`}>
                <span className="block text-sm font-medium leading-tight text-grey-900 dark:text-white">Searching...</span>
            </li>
        </Delayed>
    );
}

export function InputListItem({dataTestId, item, selected, onClick, onMouseOver, scrollIntoView, className, selectedClassName, children}) {
    const itemRef = React.useRef(null);

    React.useEffect(() => {
        if (selected && scrollIntoView) {
            itemRef.current.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
        }
    }, [selected, scrollIntoView]);

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleMouseDown = (event) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onClick(item);
    };

    const pointerClassName = !item.value ? 'pointer-events-none' : '';

    return (
        <li ref={itemRef} aria-selected={selected} className={`${selected ? selectedClassName : ''} ${pointerClassName} ${className}`} data-testid={`${dataTestId}-listOption`} role="option" onMouseDownCapture={handleMouseDown} onMouseOver={onMouseOver}>
            {children}
        </li>
    );
}

export function InputListGroup({dataTestId, group, showSpinner}) {
    return (
        <li className="mb-0 mt-2 flex items-center justify-between border-t border-grey-200 px-4 pb-2 pt-3 text-[1.1rem] font-semibold uppercase tracking-wide text-grey-600 first-of-type:mt-0 first-of-type:border-t-0 dark:border-grey-900" data-testid={`${dataTestId}-listGroup`}>
            <div className="flex items-center gap-1.5">
                {group.label}
                {showSpinner && <span className="ml-px" data-testid="input-list-spinner"><Spinner size="mini" /></span>}
            </div>
        </li>
    );
}

function defaultGetItem(/*item, selected, onMouseOver, scrollIntoView*/) {
    throw new Error('<InputList> getItem function prop must be provided');
}

/**
 * Little warning here: this has an onChange handler that doesn't have an event as parameter, but just the value.
 *
 * @param {object} options
 * @param {{value: string, label: string}[]} [options.listOptions]
 * @param {string} [options.list]
 * @returns
 */
export function InputList({autoFocus, className, inputClassName, dropdownClassName, dropdownPlacementBottomClass, dropdownPlacementTopClass, dataTestId, listOptions, isLoading, value, placeholder, onChange, onSelect, getItem = defaultGetItem}) {
    const [inputFocused, setInputFocused] = React.useState(false);

    const onFocus = () => {
        setInputFocused(true);
    };

    const onBlur = () => {
        setInputFocused(false);
    };

    const getGroup = (group, {showSpinner} = {}) => {
        return (
            <InputListGroup key={group.label} dataTestId={dataTestId} group={group} showSpinner={showSpinner} />
        );
    };

    const onChangeEvent = (event) => {
        onChange(event.target.value);
    };

    const onSelectEvent = (item) => {
        (onSelect || onChange)(item.value, item.type);
    };

    const hasGroups = listOptions && listOptions[0]?.items;
    const showSuggestions = (isLoading || (listOptions && !!listOptions.length)) && inputFocused;

    const Suggestions = () => {
        return (
            <DropdownContainer
                className={dropdownClassName}
                dataTestId={dataTestId}
                placementBottomClass={dropdownPlacementBottomClass}
                placementTopClass={dropdownPlacementTopClass}
            >
                {isLoading && !listOptions?.length && <InputListLoadingItem dataTestId={dataTestId}/>}
                {hasGroups ? (
                    <KeyboardSelectionWithGroups
                        getGroup={getGroup}
                        getItem={getItem}
                        groups={listOptions}
                        isLoading={isLoading}
                        onSelect={onSelectEvent}
                    />
                ) : (
                    <KeyboardSelection
                        getItem={getItem}
                        items={listOptions}
                        onSelect={onSelectEvent}
                    />
                )}
            </DropdownContainer>
        );
    };

    return (
        <>
            <div className={`relative z-0 ${className || ''}`}>
                <Input
                    autoFocus={autoFocus}
                    className={inputClassName}
                    dataTestId={dataTestId}
                    placeholder={placeholder}
                    value={value}
                    onBlur={onBlur}
                    onChange={onChangeEvent}
                    onFocus={onFocus}
                />
                {showSuggestions && <Suggestions />}
            </div>
        </>
    );
}
