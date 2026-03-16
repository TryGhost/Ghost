import React from 'react';
import {Delayed} from './Delayed';
import {DropdownContainer} from './DropdownContainer';
import {Input} from './Input';
import {KeyboardSelection} from './KeyboardSelection';
import {KeyboardSelectionWithGroups, type GroupData, type GroupItem} from './KeyboardSelectionWithGroups';
import {Spinner} from './Spinner';

export interface InputListOption extends GroupItem {
    type?: string;
    label?: React.ReactNode;
}

interface InputListLoadingItemProps {
    dataTestId?: string;
}

export function InputListLoadingItem({dataTestId}: InputListLoadingItemProps) {
    return (
        <Delayed>
            <li className={`mb-0 px-4 py-2 text-left`} data-testid={`${dataTestId}-loading`}>
                <span className="block text-sm font-medium leading-tight text-grey-900 dark:text-white">Searching...</span>
            </li>
        </Delayed>
    );
}

interface InputListItemProps<T extends InputListOption> {
    dataTestId?: string;
    item: T;
    selected?: boolean;
    onClick?: (item: T) => void;
    onMouseOver?: () => void;
    scrollIntoView?: boolean;
    className?: string;
    selectedClassName?: string;
    children?: React.ReactNode;
}

export function InputListItem<T extends InputListOption>({dataTestId, item, selected, onClick, onMouseOver, scrollIntoView, className, selectedClassName, children}: InputListItemProps<T>) {
    const itemRef = React.useRef<HTMLLIElement>(null);

    React.useEffect(() => {
        if (selected && scrollIntoView) {
            itemRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
        }
    }, [selected, scrollIntoView]);

    // We use the capture phase of the mouse down event, otherwise the list option will be removed when blurring the input
    // before calling the click event
    const handleMouseDown = (event: React.MouseEvent) => {
        // Prevent losing focus when clicking an option
        event.preventDefault();
        onClick?.(item);
    };

    const pointerClassName = !item.value ? 'pointer-events-none' : '';

    return (
        <li ref={itemRef} aria-selected={selected} className={`${selected ? selectedClassName : ''} ${pointerClassName} ${className}`} data-testid={`${dataTestId}-listOption`} role="option" onMouseDownCapture={handleMouseDown} onMouseOver={onMouseOver}>
            {children}
        </li>
    );
}

interface InputListGroupProps {
    dataTestId?: string;
    group: {label: string};
    showSpinner?: boolean;
}

export function InputListGroup({dataTestId, group, showSpinner}: InputListGroupProps) {
    return (
        <li className="mb-0 mt-2 flex items-center justify-between border-t border-grey-200 px-4 pb-2 pt-3 text-[1.1rem] font-semibold uppercase tracking-wide text-grey-600 first-of-type:mt-0 first-of-type:border-t-0 dark:border-grey-900" data-testid={`${dataTestId}-listGroup`}>
            <div className="flex items-center gap-1.5">
                {group.label}
                {showSpinner && <span className="ml-px" data-testid="input-list-spinner"><Spinner size="mini" /></span>}
            </div>
        </li>
    );
}

function defaultGetItem(): never {
    throw new Error('<InputList> getItem function prop must be provided');
}

export interface InputListProps<T extends InputListOption = InputListOption> {
    autoFocus?: boolean;
    className?: string;
    inputClassName?: string;
    dropdownClassName?: string;
    dropdownPlacementBottomClass?: string;
    dropdownPlacementTopClass?: string;
    dataTestId?: string;
    listOptions?: T[] | GroupData<T>[];
    isLoading?: boolean;
    value?: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onSelect?: (value: string, type?: string) => void;
    getItem?: (item: T, selected: boolean, onMouseOver?: () => void, scrollIntoView?: boolean) => React.ReactNode;
}

// distinguishes grouped options ({label, items}) from flat options at runtime
function isGroupedOptions<T extends InputListOption>(options: T[] | GroupData<T>[]): options is GroupData<T>[] {
    return options.length > 0 && 'items' in options[0];
}

export function InputList<T extends InputListOption = InputListOption>({autoFocus, className, inputClassName, dropdownClassName, dropdownPlacementBottomClass, dropdownPlacementTopClass, dataTestId, listOptions, isLoading, value, placeholder, onChange, onSelect, getItem = defaultGetItem}: InputListProps<T>) {
    const [inputFocused, setInputFocused] = React.useState(false);

    const onFocus = () => {
        setInputFocused(true);
    };

    const onBlur = () => {
        setInputFocused(false);
    };

    const getGroup = (group: GroupData<T>, {showSpinner}: {showSpinner?: boolean} = {}) => {
        return (
            <InputListGroup key={group.label} dataTestId={dataTestId} group={group} showSpinner={showSpinner} />
        );
    };

    const onChangeEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
    };

    const onSelectEvent = (item: T) => {
        if (item.value == null) {
            return;
        }

        (onSelect || onChange)(item.value, item.type);
    };

    const groupedOptions = listOptions && isGroupedOptions(listOptions) ? listOptions : null;
    const flatOptions = listOptions && !isGroupedOptions(listOptions) ? listOptions : null;
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
                {groupedOptions ? (
                    <KeyboardSelectionWithGroups
                        getGroup={getGroup}
                        getItem={getItem}
                        groups={groupedOptions}
                        isLoading={isLoading}
                        onSelect={onSelectEvent}
                    />
                ) : (
                    <KeyboardSelection
                        getItem={getItem}
                        items={flatOptions ?? []}
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
