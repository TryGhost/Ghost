import Heading from '../Heading';
import Hint from '../Hint';
import React, {useId, useMemo} from 'react';
import {DropdownIndicatorProps, GroupBase, MultiValue, OptionProps, OptionsOrGroups, default as ReactSelect, components} from 'react-select';

export type MultiSelectColor = 'grey' | 'black' | 'green' | 'pink';

export type MultiSelectOption = {
    value: string;
    label: string;
    color?: MultiSelectColor;
}

interface MultiSelectProps {
    options: OptionsOrGroups<MultiSelectOption, GroupBase<MultiSelectOption>>;
    values: MultiSelectOption[];
    title?: string;
    clearBg?: boolean;
    error?: boolean;
    placeholder?: string;
    color?: MultiSelectColor
    hint?: string;
    onChange: (selected: MultiValue<MultiSelectOption>) => void
}

const multiValueColor = (color?: MultiSelectColor) => {
    switch (color) {
    case 'black':
        return 'bg-black text-white';
    case 'grey':
        return 'bg-grey-300 text-black';
    case 'green':
        return 'bg-green-500 text-white';
    case 'pink':
        return 'bg-pink-500 text-white';
    default:
        return '';
    }
};

const DropdownIndicator: React.FC<DropdownIndicatorProps<MultiSelectOption, true> & {clearBg: boolean}> = ({clearBg, ...props}) => (
    <components.DropdownIndicator {...props}>
        <div className={`absolute top-[14px] block h-2 w-2 rotate-45 border-[1px] border-l-0 border-t-0 border-grey-900 content-[''] ${clearBg ? 'right-0' : 'right-4'} `}></div>
    </components.DropdownIndicator>
);

const Option: React.FC<OptionProps<MultiSelectOption, true>> = ({children, ...optionProps}) => (
    <components.Option {...optionProps}>
        <span data-testid="multiselect-option">{children}</span>
    </components.Option>
);

const MultiSelect: React.FC<MultiSelectProps> = ({
    title = '',
    clearBg = false,
    error = false,
    placeholder,
    color = 'grey',
    hint = '',
    options,
    values,
    onChange,
    ...props
}) => {
    const id = useId();

    const customClasses = {
        control: `w-full cursor-pointer appearance-none min-h-[40px] border-b ${!clearBg && 'bg-grey-75 px-[10px]'} py-2 outline-none ${error ? 'border-red' : 'border-grey-500 hover:border-grey-700'} ${(title && !clearBg) && 'mt-2'}`,
        valueContainer: 'gap-1',
        placeHolder: 'text-grey-600',
        menu: 'shadow py-2 rounded-b z-50 bg-white',
        option: 'hover:cursor-pointer hover:bg-grey-100 px-3 py-[6px]',
        multiValue: (optionColor?: MultiSelectColor) => `rounded-sm items-center text-[14px] py-px pl-2 pr-1 gap-1.5 ${multiValueColor(optionColor || color)}`,
        noOptionsMessage: 'p-3 text-grey-600',
        groupHeading: 'py-[6px] px-3 text-2xs font-semibold uppercase tracking-wide text-grey-700'
    };

    const dropdownIndicatorComponent = useMemo(() => {
        return (ddiProps: DropdownIndicatorProps<MultiSelectOption, true>) => <DropdownIndicator {...ddiProps} clearBg={clearBg} />;
    }, [clearBg]);

    return (
        <div className='flex flex-col'>
            {title && <Heading htmlFor={id} grey useLabelTag>{title}</Heading>}
            <ReactSelect
                classNames={{
                    menuList: () => 'z-50',
                    valueContainer: () => customClasses.valueContainer,
                    control: () => customClasses.control,
                    placeholder: () => customClasses.placeHolder,
                    menu: () => customClasses.menu,
                    option: () => customClasses.option,
                    multiValue: ({data}) => customClasses.multiValue(data.color),
                    noOptionsMessage: () => customClasses.noOptionsMessage,
                    groupHeading: () => customClasses.groupHeading
                }}
                closeMenuOnSelect={false}
                components={{DropdownIndicator: dropdownIndicatorComponent, Option}}
                inputId={id}
                isClearable={false}
                options={options}
                placeholder={placeholder ? placeholder : ''}
                value={values}
                isMulti
                unstyled
                onChange={onChange}
                {...props}
            />
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default MultiSelect;
