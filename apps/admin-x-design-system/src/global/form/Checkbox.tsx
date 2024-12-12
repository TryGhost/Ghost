import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import Heading from '../Heading';
import Hint from '../Hint';
import React, {useId} from 'react';
import Separator from '../Separator';

export interface CheckboxProps {
    title?: string;
    label: string;
    value: string;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    error?: boolean;
    hint?: React.ReactNode;
    key?: string;
    checked?: boolean;
    separator?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({title, label, value, onChange, disabled, error, hint, checked, separator}) => {
    const id = useId();

    const handleCheckedChange = (isChecked: boolean | 'indeterminate') => {
        onChange(isChecked === true);
    };

    return (
        <div>
            <div className={`flex flex-col gap-1 ${separator && 'pb-2'}`}>
                {title && <Heading grey={true} level={6}>{title}</Heading>}
                <label className={`flex cursor-pointer items-start ${title && '-mb-1 mt-1'}`} htmlFor={id}>
                    <CheckboxPrimitive.Root className="mt-0.5 flex h-4 w-4 cursor-pointer appearance-none items-center justify-center rounded-[3px] border border-solid border-grey-500 bg-white outline-none data-[state=checked]:border-black data-[state=indeterminate]:border-black data-[state=checked]:bg-black data-[state=indeterminate]:bg-black" defaultChecked={checked} disabled={disabled} id={id} value={value} onCheckedChange={handleCheckedChange}>
                        <CheckboxPrimitive.Indicator>
                            <svg fill="none" height="11" viewBox="0 0 10 11" width="10">
                                <path d="M1 5.88889L4.6 9L9 1" stroke="white" strokeLinecap="round" strokeWidth="2"/>
                            </svg>
                        </CheckboxPrimitive.Indicator>
                    </CheckboxPrimitive.Root>
                    <div className={`ml-2 flex flex-col ${hint && 'mb-2'}`}>
                        <span className={`inline-block text-[1.425rem] dark:text-white ${hint && '-mb-1'}`}>{label}</span>
                        {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
                    </div>
                </label>
            </div>
            {(separator || error) && <Separator className={error ? 'border-red' : ''} />}
        </div>
    );
};

export default Checkbox;
