import Heading from './Heading';
import Hint from './Hint';
import React from 'react';
import {MultiValue, default as ReactSelect, components} from 'react-select';

export type MultiSelectColor = 'grey' | 'black' | string;

export type MultiSelectOption = {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    defaultValues?: MultiSelectOption[];
    title?: string;
    clearBg?: boolean;
    error?: boolean;
    placeholder?: string;
    color?: MultiSelectColor
    hint?: string;
    onChange: (selected: MultiValue<MultiSelectOption>) => void
}

const MultiSelect: React.FC<MultiSelectProps> = ({
    title = '',
    clearBg = false,
    error = false,
    placeholder,
    color = 'grey',
    hint = '',
    options,
    defaultValues,
    onChange,
    ...props
}) => {
    let multiValueColor;
    switch (color) {
    case 'black':
        multiValueColor = 'bg-black text-white';
        break;
    case 'grey':
        multiValueColor = 'bg-grey-300 text-black';
        break;

    default:
        break;
    }

    const customClasses = {
        control: `w-full cursor-pointer appearance-none min-h-[40px] border-b ${!clearBg && 'bg-grey-75 px-[10px]'} py-2 outline-none ${error ? 'border-red' : 'border-grey-500 hover:border-grey-700'} ${(title && !clearBg) && 'mt-2'}`,
        valueContainer: 'gap-1',
        placeHolder: 'text-grey-600',
        menu: 'shadow py-2 rounded-b z-50 bg-white',
        option: 'hover:cursor-pointer hover:bg-grey-100 px-3 py-[6px]',
        multiValue: `rounded-sm items-center text-[14px] py-px pl-2 pr-1 gap-1.5 ${multiValueColor}`,
        noOptionsMessage: 'p-3 text-grey-600'
    };

    const DropdownIndicator: React.FC<any> = ddiProps => (
        <components.DropdownIndicator {...ddiProps}>
            <div className={`absolute top-[14px] block h-2 w-2 rotate-45 border-[1px] border-l-0 border-t-0 border-grey-900 content-[''] ${clearBg ? 'right-0' : 'right-4'} `}></div>
        </components.DropdownIndicator>
    );

    return (
        <div className='flex flex-col'>
            {title && <Heading grey={defaultValues ? true : false} useLabelTag={true}>{title}</Heading>}
            <ReactSelect
                classNames={{
                    menuList: () => 'z-50',
                    valueContainer: () => customClasses.valueContainer,
                    control: () => customClasses.control,
                    placeholder: () => customClasses.placeHolder,
                    menu: () => customClasses.menu,
                    option: () => customClasses.option,
                    multiValue: () => customClasses.multiValue,
                    noOptionsMessage: () => customClasses.noOptionsMessage
                }}
                components={{DropdownIndicator}}
                defaultValue={defaultValues}
                isClearable={false}
                options={options}
                placeholder={placeholder ? placeholder : ''}
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