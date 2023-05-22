import Heading from './Heading';
import Hint from './Hint';
import React, {useEffect, useState} from 'react';

interface CheckboxProps {
    id: string;
    title?: string;
    label: string;
    value: string;
    onChange: (checked: boolean) => void;
    error?:boolean;
    hint?: React.ReactNode;
    checked?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({id, title, label, value, onChange, error, hint, checked}) => {
    const [isChecked, setIsChecked] = useState(checked);

    useEffect(() => {
        setIsChecked(checked);
    }, [checked]);

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checkedValue = event.target.checked;
        setIsChecked(checkedValue);
        onChange(checkedValue);
    };

    return (
        <div className='flex flex-col gap-1'>
            {title && <Heading grey={true} level={6}>{title}</Heading>}
            <label className={`flex cursor-pointer items-start ${title && '-mb-1 mt-1'}`} htmlFor={id}>
                <input 
                    checked={isChecked}
                    className="relative float-left mt-[3px] h-4 w-4 appearance-none border-2 border-solid border-grey-300 after:absolute after:z-[1] after:block after:h-3 after:w-3 after:content-[''] checked:border-green checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:h-[0.625rem] checked:after:w-[0.625rem] checked:after:border-green checked:after:bg-green checked:after:content-[''] checked:after:[transform:translate(-50%,-50%)] hover:cursor-pointer focus:shadow-none focus:outline-none focus:ring-0 checked:focus:border-green dark:border-grey-600 dark:checked:border-green dark:checked:after:border-green dark:checked:after:bg-green dark:checked:focus:border-green"
                    id={id}
                    type='checkbox'
                    value={value}
                    onChange={handleOnChange}
                />
                <div className={`ml-2 flex flex-col ${hint && 'mb-2'}`}>
                    <span className={`inline-block text-md ${hint && '-mb-1'}`}>{label}</span>
                    {hint && <Hint>{hint}</Hint>}
                </div>
            </label>
        </div>
    );
};

export default Checkbox;