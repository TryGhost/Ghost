import React, {useId} from 'react';

import Heading from '../Heading';
import Hint from '../Hint';
import clsx from 'clsx';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    title?: string;
    prompt?: string;
    options: SelectOption[];
    selectedOption?: string
    onSelect: (value: string) => void;
    error?:boolean;
    hint?: React.ReactNode;
    clearBg?: boolean;
    containerClassName?: string;
    selectClassName?: string;
    optionClassName?: string;
    unstyled?: boolean;
}

const Select: React.FC<SelectProps> = ({
    title,
    prompt,
    options,
    selectedOption,
    onSelect,
    error,
    hint,
    clearBg = true,
    containerClassName,
    selectClassName,
    optionClassName,
    unstyled
}) => {
    const id = useId();

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onSelect(event.target.value);
    };

    let containerClasses = '';
    if (!unstyled) {
        containerClasses = clsx(
            'relative w-full after:pointer-events-none',
            `after:absolute after:block after:h-2 after:w-2 after:rotate-45 after:border-[1px] after:border-l-0 after:border-t-0 after:border-grey-900 after:content-['']`,
            title ? 'after:top-[14px]' : 'after:top-[14px]',
            clearBg ? 'after:right-0' : 'after:right-4'
        );
    }
    containerClasses = clsx(
        containerClasses,
        containerClassName
    );

    let selectClasses = '';
    if (!unstyled) {
        selectClasses = clsx(
            'h-10 w-full cursor-pointer appearance-none border-b py-2 pr-5 outline-none',
            !clearBg && 'bg-grey-75 px-[10px]',
            error ? 'border-red' : 'border-grey-500 hover:border-grey-700 focus:border-black',
            (title && !clearBg) && 'mt-2'
        );
    }
    selectClasses = clsx(
        selectClasses,
        selectClassName
    );

    const optionClasses = optionClassName;

    const select = (
        <>
            {title && <Heading grey={selectedOption || !prompt ? true : false} htmlFor={id} useLabelTag={true}>{title}</Heading>}
            <div className={containerClasses}>
                <select className={selectClasses} id={id} value={selectedOption} onChange={handleOptionChange}>
                    {prompt && <option className={optionClasses} value="">{prompt}</option>}
                    {options.map(option => (
                        <option
                            key={option.value}
                            className={optionClasses}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
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
