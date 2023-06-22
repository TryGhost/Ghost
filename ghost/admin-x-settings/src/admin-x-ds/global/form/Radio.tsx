import Heading from '../Heading';
import Hint from '../Hint';
import React from 'react';
import Separator from '../Separator';

export interface RadioOption {
    value: string;
    label: string;
    hint?: React.ReactNode;
}

interface RadioProps {
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
    const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSelect(event.target.value);
    };

    return (
        <div>
            <div className={`flex flex-col gap-2 ${separator && 'pb-2'}`}>
                {title && <Heading level={6}>{title}</Heading>}
                {options.map(option => (
                    <label key={option.value} className={`flex cursor-pointer items-start ${title && '-mb-1 mt-1'}`} htmlFor={option.value}>
                        <input
                            checked={selectedOption === option.value}
                            className="relative float-left mt-[3px] h-4 w-4 min-w-[16px] appearance-none rounded-full border-2 border-solid border-grey-300 after:absolute after:z-[1] after:block after:h-3 after:w-3 after:rounded-full after:content-[''] checked:border-green checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:h-[0.625rem] checked:after:w-[0.625rem] checked:after:rounded-full checked:after:border-green checked:after:bg-green checked:after:content-[''] checked:after:[transform:translate(-50%,-50%)] hover:cursor-pointer focus:shadow-none focus:outline-none focus:ring-0 checked:focus:border-green dark:border-grey-600 dark:checked:border-green dark:checked:after:border-green dark:checked:after:bg-green dark:checked:focus:border-green"
                            id={option.value}
                            name={id}
                            type='radio'
                            value={option.value}
                            onChange={handleOptionChange}
                        />
                        <div className={`ml-2 flex flex-col ${option.hint && 'mb-2'}`}>
                            <span className={`inline-block text-md ${option.hint && '-mb-1'}`}>{option.label}</span>
                            {option.hint && <Hint>{option.hint}</Hint>}
                        </div>
                    </label>
                ))}
                {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
            </div>
            {(separator || error) && <Separator className={error ? 'border-red' : ''} />}
        </div>
    );
};

export default Radio;
