import React from 'react';
import escapeRegExp from 'lodash/escapeRegExp';
import {Delayed} from './Delayed';
import {DropdownContainerCopy} from './DropdownContainerCopy';
import {Input} from './Input';
import {KeyboardSelectionWithGroups} from './KeyboardSelectionWithGroups';

export function InputListLoadingItem({dataTestId}) {
    return (
        <Delayed>
            <li className={`mb-0 px-4 py-2 text-left`} data-testid={`${dataTestId}-loading`}>
                <span className="block text-sm font-medium leading-tight text-grey-900 dark:text-white">Searching...</span>
            </li>
        </Delayed>
    );
}

export function InputListItem({dataTestId, item, selected, onClick, onMouseOver, highlightString}) {
    let selectionClass = '';

    if (selected) {
        selectionClass = 'bg-grey-100 dark:bg-grey-900';
    }

    if (!item.value) {
        selectionClass = 'pointer-events-none';
    }

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleMouseDown = (event) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onClick(item);
    };

    const HighlightedLabel = () => {
        if (!highlightString || item.highlight === false) {
            return item.label;
        }

        const parts = item.label.split(new RegExp(`(${escapeRegExp(highlightString)})`, 'gi'));

        return (
            <>
                {parts.map((part, index) => {
                    if (part.toLowerCase() === highlightString.toLowerCase()) {
                        // eslint-disable-next-line react/no-array-index-key
                        return <span key={index} className="font-bold">{part}</span>;
                    }

                    return part;
                })}
            </>
        );
    };

    const Icon = item.Icon;

    return (
        <li aria-selected={selected} className={`${selectionClass} my-[.2rem] flex cursor-pointer items-center justify-between gap-3 rounded-md px-4 py-2 text-left text-black dark:text-white`} data-testid={`${dataTestId}-listOption`} role="option" onMouseDownCapture={handleMouseDown} onMouseOver={onMouseOver}>
            <span className="line-clamp-1 flex items-center gap-[.6rem]">
                {Icon && <Icon className="size-[1.4rem] stroke-[1.5px]" />}
                <span className="block truncate text-sm font-medium leading-snug" data-testid={`${dataTestId}-listOption-label`}><HighlightedLabel /></span>
            </span>
            {selected && (item.metaText || item.MetaIcon) && (
                <span className="flex shrink-0 items-center gap-[.6rem] text-[1.3rem] leading-snug tracking-tight text-grey-600 dark:text-grey-500" data-testid={`${dataTestId}-listOption-meta`}>
                    <span title={item.metaIconTitle}>{item.MetaIcon && <item.MetaIcon className="size-[1.4rem]" />}</span>
                    {item.metaText && <span>{item.metaText}</span>}
                </span>
            )}
        </li>
    );
}

export function InputListGroup({dataTestId, group}) {
    return (
        <li className="mb-0 mt-2 flex items-center justify-between border-t border-grey-200 px-4 pb-2 pt-3 text-[1.1rem] font-semibold uppercase tracking-wide text-grey-600 first-of-type:mt-0 first-of-type:border-t-0 dark:border-grey-900" data-testid={`${dataTestId}-listGroup`}>{group.label}</li>
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
export function InputListCopy({autoFocus, className, inputClassName, dataTestId, listOptions, isLoading, value, placeholder, onChange, onSelect}) {
    const [inputFocused, setInputFocused] = React.useState(false);

    const onFocus = () => {
        setInputFocused(true);
    };

    const onBlur = () => {
        setInputFocused(false);
    };

    const getItem = (item, selected, onMouseOver) => {
        return (
            <InputListItem
                key={item.value}
                dataTestId={dataTestId}
                highlightString={value}
                item={item}
                selected={selected}
                onClick={onSelectEvent}
                onMouseOver={onMouseOver}
            />
        );
    };

    const getGroup = (group) => {
        return (
            <InputListGroup key={group.label} dataTestId={dataTestId} group={group} />
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
                {showSuggestions &&
                    <DropdownContainerCopy data-testid={`${dataTestId}-dropdown`}>
                        {isLoading && <InputListLoadingItem dataTestId={dataTestId}/>}
                        <KeyboardSelectionWithGroups
                            getGroup={getGroup}
                            getItem={getItem}
                            groups={listOptions}
                            onSelect={onSelectEvent}
                        />
                    </DropdownContainerCopy>
                }
            </div>
        </>
    );
}
