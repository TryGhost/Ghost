import React from 'react';
import Heading from '../Heading';
import Hint from '../Hint';
import Separator from '../Separator';
import * as RadioPrimitive from '@radix-ui/react-radio-group';

export interface RadioOption {
    value: string;
    label: string;
    hint?: React.ReactNode;
}

export interface RadioProps {
    id: string;
    title?: string;
    selectedOption?: string;
    options: RadioOption[];
    onSelect: (value: string) => void;
    error?:boolean;
    hint?: React.ReactNode;
    separator?: boolean;
}

const Radio: React.FC<RadioProps> = ({id, title, options, onSelect, error, hint, selectedOption, separator}) => {
    return (
        <RadioPrimitive.Root defaultValue={selectedOption} name={id} onValueChange={onSelect}>
            <div className={`flex flex-col gap-2 ${separator && 'pb-2'}`}>
                {title && <Heading level={6}>{title}</Heading>}
                {options.map(option => (
                    <label key={option.value} className={`flex cursor-pointer items-start ${title && '-mb-1 mt-1'}`} htmlFor={option.value}>
                        <RadioPrimitive.Item className="relative float-left mt-[3px] h-4 w-4 min-w-[16px] appearance-none rounded-full border-2 border-solid border-grey-300 hover:cursor-pointer focus:shadow-none focus:outline-none focus:ring-0 data-[state=checked]:border-green data-[state=checked]:focus:border-green dark:border-grey-800 dark:text-white dark:data-[state=checked]:border-green dark:data-[state=checked]:focus:border-green" id={option.value} value={option.value}>
                            <RadioPrimitive.Indicator className="flex h-full w-full items-center justify-center after:block after:h-[6px] after:w-[6px] after:rounded-full after:border-green after:bg-green after:content-[''] dark:after:border-green dark:after:bg-green" />
                        </RadioPrimitive.Item>
                        <div className={`ml-2 flex flex-col ${option.hint && 'mb-2'}`}>
                            <span className={`inline-block text-md dark:text-white ${option.hint && '-mb-1'}`}>{option.label}</span>
                            {option.hint && <Hint>{option.hint}</Hint>}
                        </div>
                    </label>
                ))}
                {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
            </div>
            {(separator || error) && <Separator className={error ? 'border-red' : ''} />}
        </RadioPrimitive.Root>
    );
};

export default Radio;
