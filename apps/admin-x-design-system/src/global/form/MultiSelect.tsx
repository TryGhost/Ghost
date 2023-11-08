import clsx from 'clsx';
import React, {useId, useMemo} from 'react';
import {DropdownIndicatorProps, GroupBase, MultiValue, OptionProps, OptionsOrGroups, Props, default as ReactSelect, components} from 'react-select';
import AsyncSelect from 'react-select/async';
import AsyncCreatableSelect from 'react-select/async-creatable';
import CreatableSelect from 'react-select/creatable';
import Heading from '../Heading';
import Hint from '../Hint';

export type MultiSelectColor = 'grey' | 'black' | 'green' | 'pink';
type FieldStyles = 'text' | 'dropdown';

export type MultiSelectOption = {
    value: string;
    label: string;
    color?: MultiSelectColor;
}

export type LoadMultiSelectOptions = (inputValue: string, callback: (options: OptionsOrGroups<MultiSelectOption, GroupBase<MultiSelectOption>>) => void) => void

type MultiSelectOptionProps = {
    async: true;
    defaultOptions: boolean | OptionsOrGroups<MultiSelectOption, GroupBase<MultiSelectOption>>;
    loadOptions: LoadMultiSelectOptions;
    options?: never;
} | {
    async?: false;
    options: OptionsOrGroups<MultiSelectOption, GroupBase<MultiSelectOption>>;
    defaultOptions?: never;
    loadOptions?: never;
}

export type MultiSelectProps = MultiSelectOptionProps & {
    values: MultiValue<MultiSelectOption>;
    title?: string;
    clearBg?: boolean;
    error?: boolean;
    placeholder?: string;
    color?: MultiSelectColor
    size?: 'sm' | 'md';
    fieldStyle?: FieldStyles;
    hint?: string;
    onChange: (selected: MultiValue<MultiSelectOption>) => void;
    canCreate?: boolean;
    testId?: string;
}

const multiValueColor = (color?: MultiSelectColor) => {
    switch (color) {
    case 'black':
        return 'bg-black text-white dark:bg-white dark:text-black';
    case 'grey':
        return 'bg-grey-300 text-black dark:bg-grey-500';
    case 'green':
        return 'bg-green-500 text-white';
    case 'pink':
        return 'bg-pink-500 text-white';
    default:
        return '';
    }
};

const DropdownIndicator: React.FC<DropdownIndicatorProps<MultiSelectOption, true> & {clearBg: boolean, fieldStyle: FieldStyles}> = ({clearBg, fieldStyle, ...props}) => {
    if (fieldStyle === 'text') {
        return <></>;
    }
    return (
        <components.DropdownIndicator {...props}>
            <div className={`absolute top-[14px] block h-2 w-2 rotate-45 border-[1px] border-l-0 border-t-0 border-grey-900 content-[''] dark:border-grey-400 ${clearBg ? 'right-0' : 'right-4'} `}></div>
        </components.DropdownIndicator>
    );
};

const Option: React.FC<OptionProps<MultiSelectOption, true>> = ({children, ...optionProps}) => (
    <components.Option {...optionProps}>
        <span data-testid="select-option">{children}</span>
    </components.Option>
);

const MultiSelect: React.FC<MultiSelectProps> = ({
    title = '',
    clearBg = false,
    error = false,
    placeholder,
    color = 'grey',
    size = 'md',
    fieldStyle = 'dropdown',
    hint = '',
    async,
    options,
    defaultOptions,
    loadOptions,
    values,
    onChange,
    canCreate = false,
    testId,
    ...props
}) => {
    const id = useId();

    const controlClasses = clsx(
        'w-full cursor-pointer appearance-none rounded-md border border-transparent transition-all dark:text-white',
        size === 'sm' ? 'min-h-[36px] py-1 text-sm' : 'min-h-[40px] py-2',
        fieldStyle === 'dropdown' ? 'cursor-pointer' : 'cursor-text',
        !clearBg && 'bg-grey-150 px-[10px] dark:bg-grey-900',
        'outline-none',
        error ? 'border-red' : 'hover:bg-grey-100 dark:hover:bg-grey-925',
        (title && !clearBg) && 'mt-2'
    );

    const optionClasses = clsx(
        size === 'sm' ? 'text-sm' : '',
        'px-3 py-[6px] hover:cursor-pointer hover:bg-grey-100 dark:text-white dark:hover:bg-grey-900'
    );

    const customClasses = {
        control: controlClasses,
        valueContainer: 'gap-1',
        placeHolder: 'text-grey-500 dark:text-grey-800',
        menu: 'shadow py-2 rounded-b z-[10000] bg-white dark:bg-black dark:border dark:border-grey-900',
        option: optionClasses,
        multiValue: (optionColor?: MultiSelectColor) => `rounded-sm items-center text-[14px] py-px pl-2 pr-1 gap-1.5 ${multiValueColor(optionColor || color)}`,
        noOptionsMessage: 'p-3 text-grey-600',
        groupHeading: 'py-[6px] px-3 text-2xs font-semibold uppercase tracking-wide text-grey-700'
    };

    const dropdownIndicatorComponent = useMemo(() => {
        // TODO: fix "Component definition is missing display name"
        // eslint-disable-next-line react/display-name
        return (ddiProps: DropdownIndicatorProps<MultiSelectOption, true>) => <DropdownIndicator {...ddiProps} clearBg={clearBg} fieldStyle={fieldStyle} />;
    }, [clearBg, fieldStyle]);

    const commonOptions: Props<MultiSelectOption, true> = {
        classNames: {
            menuList: () => 'z-50',
            valueContainer: () => customClasses.valueContainer,
            control: () => customClasses.control,
            placeholder: () => customClasses.placeHolder,
            menu: () => customClasses.menu,
            option: () => customClasses.option,
            multiValue: ({data}) => customClasses.multiValue(data.color),
            noOptionsMessage: () => customClasses.noOptionsMessage,
            groupHeading: () => customClasses.groupHeading
        },
        closeMenuOnSelect: false,
        components: {DropdownIndicator: dropdownIndicatorComponent, Option},
        inputId: id,
        isClearable: false,
        placeholder: placeholder ? placeholder : '',
        value: values,
        isMulti: true,
        unstyled: true,
        onChange,
        ...props
    };

    return (
        <div className='flex flex-col'>
            {title && <Heading htmlFor={id} grey useLabelTag>{title}</Heading>}
            <div data-testid={testId}>
                {async ?
                    (canCreate ? <AsyncCreatableSelect {...commonOptions} defaultOptions={defaultOptions} loadOptions={loadOptions} /> : <AsyncSelect {...commonOptions} defaultOptions={defaultOptions} loadOptions={loadOptions} />) :
                    (canCreate ? <CreatableSelect {...commonOptions} options={options} /> : <ReactSelect {...commonOptions} options={options} />)
                }
            </div>
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default MultiSelect;
