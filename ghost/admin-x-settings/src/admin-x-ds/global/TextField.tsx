import React from 'react';

import Heading from './Heading';
import Hint from './Hint';

type TextFieldType = 'text' | 'number' | 'email' | 'password' | 'file' | 'date' | 'time' | 'search';

interface TextFieldProps {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    type?: TextFieldType;
    value?: string;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    clearBg?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    maxLength?: number;
}

const TextField: React.FC<TextFieldProps> = ({
    type = 'text', 
    inputRef, 
    title, 
    value, 
    error, 
    placeholder, 
    hint, 
    clearBg = false, 
    onChange, 
    className = '',
    maxLength,
    ...props
}) => {
    return (
        <div className='flex flex-col'>
            {title && <Heading useLabelTag={true}>{title}</Heading>}
            <input
                ref={inputRef} 
                className={`border-b ${!clearBg && 'bg-grey-100 px-[10px]'} py-2 ${error ? `border-red` : `border-grey-300 hover:border-grey-400 focus:border-black`} ${(title && !clearBg) && `mt-2`} ${className}`} 
                defaultValue={value} 
                maxLength={maxLength} 
                placeholder={placeholder}
                type={type}
                onChange={onChange}
                {...props} />
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default TextField;