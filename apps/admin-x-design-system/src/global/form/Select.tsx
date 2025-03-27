import clsx from 'clsx';
import React, {useId, useMemo, useEffect} from 'react';
import ReactSelect, {ClearIndicatorProps, DropdownIndicatorProps, GroupBase, MenuPlacement, OptionProps, OptionsOrGroups, Props, components} from 'react-select';
import AsyncSelect from 'react-select/async';
import {useFocusContext} from '../../providers/DesignSystemProvider';
import Heading from '../Heading';
import Hint from '../Hint';
import Icon from '../Icon';

export interface SelectOption {
    value: string;
    label: string;
    hint?: string;
    key?: string;
    className?: string;
}

export interface SelectOptionGroup {
    label: string;
    key?: string;
    options: SelectOption[];
}

export interface SelectControlClasses {
    control?: string;
    valueContainer?: string;
    placeHolder?: string;
    menu?: string;
    option?: string;
    noOptionsMessage?: string;
    groupHeading?: string;
    clearIndicator?: string;
}

export type LoadSelectOptions = (inputValue: string, callback: (options: OptionsOrGroups<SelectOption, GroupBase<SelectOption>>) => void) => void

type SelectOptionProps = {
    async: true;
    defaultOptions: boolean | OptionsOrGroups<SelectOption, GroupBase<SelectOption>>;
    loadOptions: LoadSelectOptions;
    options?: never;
} | {
    async?: false;
    options: OptionsOrGroups<SelectOption, GroupBase<SelectOption>>;
    defaultOptions?: never;
    loadOptions?: never;
}

export type SelectProps = Props<SelectOption, false> & SelectOptionProps & {
    async?: boolean;
    title?: string;
    hideTitle?: boolean;
    size?: 'xs' | 'md';
    prompt?: string;
    selectedOption?: SelectOption
    onSelect: (option: SelectOption | null) => void;
    error?:boolean;
    hint?: React.ReactNode;
    clearBg?: boolean;
    border?: boolean;
    fullWidth?: boolean;
    isSearchable?: boolean;
    containerClassName?: string;
    controlClasses?: SelectControlClasses;
    unstyled?: boolean;
    disabled?: boolean;
    testId?: string;
}

const DropdownIndicator: React.FC<DropdownIndicatorProps<SelectOption, false> & {clearBg: boolean}> = ({clearBg, ...props}) => (
    <components.DropdownIndicator {...props}>
        <div className={`absolute top-1/2 mt-[-5px] block h-2 w-2 rotate-45 border-[1px] border-l-0 border-t-0 border-grey-900 content-[''] dark:border-grey-400 ${clearBg ? 'right-2' : 'right-[14px]'} `}></div>
    </components.DropdownIndicator>
);

const ClearIndicator: React.FC<ClearIndicatorProps<SelectOption, false>> = props => (
    <components.ClearIndicator {...props}>
        <Icon className='mr-2' name='close' size='xs' />
        {/* <div className={`pr-2 text-xl leading-none text-grey-900 dark:text-grey-400`}>&times;</div> */}
    </components.ClearIndicator>
);

const Option: React.FC<OptionProps<SelectOption, false>> = ({children, ...optionProps}) => (
    <components.Option {...optionProps}>
        <span className={optionProps.isSelected ? 'relative flex w-full items-center justify-between gap-2' : ''} data-testid="select-option" data-value={optionProps.data.value}>{children}{optionProps.isSelected && <span><Icon name='check' size={14} /></span>}</span>
        {optionProps.data.hint && <span className="block text-xs text-grey-700 dark:text-grey-300">{optionProps.data.hint}</span>}
    </components.Option>
);

const Select: React.FC<SelectProps> = ({
    async,
    title,
    hideTitle,
    size = 'md',
    prompt,
    options,
    selectedOption,
    onSelect,
    error,
    hint,
    clearBg = false,
    fullWidth = true,
    isSearchable = false,
    containerClassName,
    controlClasses,
    unstyled,
    disabled = false,
    testId,
    ...props
}) => {
    const id = useId();
    const {setFocusState, isAnyTextFieldFocused} = useFocusContext();
    const handleFocus = () => {
        setFocusState(true);
    };

    const handleBlur = () => {
        setFocusState(false);
    };

    useEffect(() => {
        if (isAnyTextFieldFocused) {
            const handleEscapeKey = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    // Fix for Safari - if an element in the modal is focused, closing it will jump to
                    // the bottom of the page because Safari tries to focus the "next" element in the DOM
                    if (document.activeElement && document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    setFocusState(false);

                    // Prevent the event from bubbling up to the window level
                    event.stopPropagation();
                }
            };

            document.addEventListener('keydown', handleEscapeKey);

            // Clean up the event listener when the modal is closed
            return () => {
                document.removeEventListener('keydown', handleEscapeKey);
            };
        }
    }, [setFocusState, isAnyTextFieldFocused]);

    let containerClasses = '';
    if (!unstyled) {
        containerClasses = clsx(
            'dark:text-white',
            fullWidth && 'w-full',
            disabled && 'cursor-not-allowed opacity-40'
        );
    }
    containerClasses = clsx(
        containerClasses,
        containerClassName
    );

    const customClasses = {
        control: clsx(
            controlClasses?.control,
            'h-9 min-h-[36px] w-full appearance-none rounded-lg border outline-none dark:text-white md:h-[38px] md:min-h-[38px]',
            size === 'xs' ? 'py-0 pr-2 text-xs' : 'py-1 pr-4',
            clearBg ? '' : 'bg-grey-150 px-3 dark:bg-grey-900',
            error ? 'border-red' : `border-transparent ${!clearBg && 'hover:bg-grey-100 dark:hover:bg-grey-925'}`,
            !disabled && 'cursor-pointer',
            (title && !clearBg) && 'mt-1.5'
        ),
        valueContainer: clsx('mr-1.5 gap-1', controlClasses?.valueContainer),
        placeHolder: clsx('text-grey-700 dark:text-grey-800', controlClasses?.placeHolder),
        menu: clsx(
            'z-[300] mt-0.5 overflow-hidden rounded-lg bg-white shadow-lg dark:border dark:border-grey-900 dark:bg-black',
            size === 'xs' && 'text-xs',
            controlClasses?.menu
        ),
        option: clsx('group px-3 py-[7px] hover:cursor-pointer hover:bg-grey-100 dark:text-white dark:hover:bg-grey-900', controlClasses?.option),
        noOptionsMessage: clsx('nowrap p-3 text-grey-600', controlClasses?.noOptionsMessage),
        groupHeading: clsx('px-3 py-[7px] text-2xs font-semibold uppercase tracking-wide text-grey-700', controlClasses?.groupHeading),
        clearIndicator: clsx('', controlClasses?.clearIndicator)
    };

    const dropdownIndicatorComponent = useMemo(() => {
        return function DropdownIndicatorComponent(ddiProps: DropdownIndicatorProps<SelectOption, false>) {
            return <DropdownIndicator {...ddiProps} clearBg={clearBg} />;
        };
    }, [clearBg]);

    const {components: propComponents = {}, ...restProps} = props;

    // Define your default components
    const defaultComponents = {
        DropdownIndicator: dropdownIndicatorComponent,
        Option,
        ClearIndicator
    };

    // Merge the default components with those passed via props
    const allComponents = {
        ...defaultComponents,
        ...propComponents
    };

    const customProps = {
        classNames: {
            menuList: () => 'z-[300]',
            valueContainer: () => customClasses.valueContainer,
            control: () => customClasses.control,
            placeholder: () => customClasses.placeHolder,
            menu: () => customClasses.menu,
            /* eslint-disable @typescript-eslint/no-explicit-any */
            option: (state: any) => {
                if (state.data.className) {
                    return clsx(customClasses.option, state.data.className);
                }
                return customClasses.option;
            },
            noOptionsMessage: () => customClasses.noOptionsMessage,
            groupHeading: () => customClasses.groupHeading,
            clearIndicator: () => customClasses.clearIndicator
        },
        // components: {DropdownIndicator: dropdownIndicatorComponent, Option, ClearIndicator},
        inputId: id,
        isClearable: false,
        isSearchable: isSearchable,
        options,
        placeholder: prompt ? prompt : '',
        value: selectedOption,
        isDisabled: disabled,
        unstyled: true,
        onChange: onSelect,
        onFocus: handleFocus,
        onBlur: handleBlur,
        menuPlacement: 'auto' as MenuPlacement
    };

    const select = (
        <>
            {title && <Heading className={hideTitle ? 'sr-only' : ''} grey={selectedOption || !prompt ? true : false} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            <div className={containerClasses} data-testid={testId}>
                {async ?
                    <AsyncSelect<SelectOption, false> {...customProps} {...props} /> :
                    <ReactSelect<SelectOption, false> {...customProps} {...restProps} components={allComponents} />
                }
            </div>
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </>
    );

    return (
        unstyled ? select : (title || hint ? (
            <div>
                {select}
            </div>) : select)
    );
};

export default Select;
