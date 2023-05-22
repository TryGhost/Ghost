import React from 'react';

import Heading from './Heading';
import Hint from './Hint';

type InputFieldType = 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'radio' | 'file' | 'date' | 'time' | 'range' | 'search';

interface ITextField {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    type?: InputFieldType;
    value?: string;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField: React.FC<ITextField> = ({
    type = 'text', inputRef, title, value, error, placeholder, hint, onChange, ...props
}) => {
    return (
        <div className='flex flex-col'>
            {title && <Heading useLabelTag={true}>{title}</Heading>}
            <input
                ref={inputRef} 
                className={`border-b bg-grey-100 px-[10px] py-2 ${error ? `border-red` : `border-grey-300 hover:border-grey-400 focus:border-grey-600`} ${title && `mt-2`}`} 
                defaultValue={value} 
                placeholder={placeholder} 
                type='text'
                onChange={onChange}
                {...props} />
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default TextField;