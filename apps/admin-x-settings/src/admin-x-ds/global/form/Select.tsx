import AsyncSelect from 'react-select/async';
import Heading from '../Heading';
import Hint from '../Hint';
import Icon from '../Icon';
import React, {useId, useMemo} from 'react';
import ReactSelect, {ClearIndicatorProps, DropdownIndicatorProps, GroupBase, OptionProps, OptionsOrGroups, Props, components} from 'react-select';
import clsx from 'clsx';

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

export type LoadOptions = (inputValue: string, callback: (options: OptionsOrGroups<SelectOption, GroupBase<SelectOption>>) => void) => void

type SelectOptionProps = {
    async: true;
    defaultOptions: boolean | OptionsOrGroups<SelectOption, GroupBase<SelectOption>>;
    loadOptions: LoadOptions;
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
    containerClassName?: string;
    controlClasses?: SelectControlClasses;
    unstyled?: boolean;
    disabled?: boolean;
}

const DropdownIndicator: React.FC<DropdownIndicatorProps<SelectOption, false> & {clearBg: boolean}> = ({clearBg, ...props}) => (
    <components.DropdownIndicator {...props}>
        <div className={`absolute top-[14px] block h-2 w-2 rotate-45 border-[1px] border-l-0 border-t-0 border-grey-900 content-[''] dark:border-grey-400 ${clearBg ? 'right-0' : 'right-4'} `}></div>
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
        <span data-testid="select-option" data-value={optionProps.data.value}>{children}</span>
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
    clearBg = true,
    border = true,
    fullWidth = true,
    containerClassName,
    controlClasses,
    unstyled,
    disabled = false,
    ...props
}) => {
    const id = useId();

    let containerClasses = '';
    if (!unstyled) {
        containerClasses = clsx(
            'dark:text-white',
            fullWidth && 'w-full',
            disabled && 'opacity-40'
        );
    }
    containerClasses = clsx(
        containerClasses,
        containerClassName
    );

    const customClasses = {
        control: clsx(
            controlClasses?.control,
            'min-h-[40px] w-full cursor-pointer appearance-none outline-none dark:text-white',
            size === 'xs' ? 'py-0 pr-2 text-xs' : 'py-2 pr-4',
            border && 'border-b',
            !clearBg && 'bg-grey-75 px-[10px] dark:bg-grey-950',
            error ? 'border-red' : 'border-grey-500 hover:border-grey-700 dark:border-grey-800 dark:hover:border-grey-700',
            (title && !clearBg) && 'mt-2'
        ),
        valueContainer: clsx('gap-1', controlClasses?.valueContainer),
        placeHolder: clsx('text-grey-500 dark:text-grey-800', controlClasses?.placeHolder),
        menu: clsx(
            'z-[300] rounded-b bg-white py-2 shadow dark:border dark:border-grey-900 dark:bg-black',
            size === 'xs' && 'text-xs',
            controlClasses?.menu
        ),
        option: clsx('px-3 py-[6px] hover:cursor-pointer hover:bg-grey-100 dark:text-white dark:hover:bg-grey-900', controlClasses?.option),
        noOptionsMessage: clsx('p-3 text-grey-600', controlClasses?.noOptionsMessage),
        groupHeading: clsx('px-3 py-[6px] text-2xs font-semibold uppercase tracking-wide text-grey-700', controlClasses?.groupHeading),
        clearIndicator: clsx('', controlClasses?.clearIndicator)
    };

    const dropdownIndicatorComponent = useMemo(() => {
        return function DropdownIndicatorComponent(ddiProps: DropdownIndicatorProps<SelectOption, false>) {
            return <DropdownIndicator {...ddiProps} clearBg={clearBg} />;
        };
    }, [clearBg]);

    const customProps = {
        classNames: {
            menuList: () => 'z-[300]',
            valueContainer: () => customClasses.valueContainer,
            control: () => customClasses.control,
            placeholder: () => customClasses.placeHolder,
            menu: () => customClasses.menu,
            option: () => customClasses.option,
            noOptionsMessage: () => customClasses.noOptionsMessage,
            groupHeading: () => customClasses.groupHeading,
            clearIndicator: () => customClasses.clearIndicator
        },
        components: {DropdownIndicator: dropdownIndicatorComponent, Option, ClearIndicator},
        inputId: id,
        isClearable: false,
        options,
        placeholder: prompt ? prompt : '',
        value: selectedOption,
        unstyled: true,
        onChange: onSelect
    };

    const select = (
        <>
            {title && <Heading className={hideTitle ? 'sr-only' : ''} grey={selectedOption || !prompt ? true : false} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            <div className={containerClasses}>
                {async ?
                    <AsyncSelect<SelectOption, false> {...customProps} {...props} /> :
                    <ReactSelect<SelectOption, false> {...customProps} {...props} />
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
