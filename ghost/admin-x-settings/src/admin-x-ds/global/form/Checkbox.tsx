import Heading from '../Heading';
import Hint from '../Hint';
import React, {useEffect, useState} from 'react';
import Separator from '../Separator';

interface CheckboxProps {
    id: string;
    title?: string;
    label: string;
    value: string;
    onChange: (checked: boolean) => void;
    error?:boolean;
    hint?: React.ReactNode;
    checked?: boolean;
    separator?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({id, title, label, value, onChange, error, hint, checked, separator}) => {
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
        <div>
            <div className={`flex flex-col gap-1 ${separator && 'pb-2'}`}>
                {title && <Heading grey={true} level={6}>{title}</Heading>}
                <label className={`flex cursor-pointer items-start ${title && '-mb-1 mt-1'}`} htmlFor={id}>
                    <input
                        checked={isChecked}
                        className="relative float-left mt-[3px] h-4 w-4 appearance-none border-2 border-solid border-grey-300 outline-none checked:border-green checked:bg-green checked:after:absolute checked:after:-mt-px checked:after:ml-[3px] checked:after:block checked:after:h-[11px] checked:after:w-[6px] checked:after:rotate-45 checked:after:border-[2px] checked:after:border-l-0 checked:after:border-t-0 checked:after:border-solid checked:after:border-white checked:after:bg-transparent checked:after:content-[''] hover:cursor-pointer focus:shadow-none focus:transition-[border-color_0.2s] dark:border-grey-600 dark:checked:border-green dark:checked:bg-green"
                        id={id}
                        type='checkbox'
                        value={value}
                        onChange={handleOnChange}
                    />
                    <div className={`ml-2 flex flex-col ${hint && 'mb-2'}`}>
                        <span className={`inline-block text-md ${hint && '-mb-1'}`}>{label}</span>
                        {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
                    </div>
                </label>
            </div>
            {(separator || error) && <Separator className={error ? 'border-red' : ''} />}
        </div>
    );
};

export default Checkbox;