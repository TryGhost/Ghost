import React from 'react';

import Heading from './Heading';
import Hint from './Hint';

interface ITextField {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    value?: string;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField: React.FC<ITextField> = ({inputRef, title, value, error, placeholder, hint, onChange, ...props}) => {   
    return (
        <div className='flex flex-col'>
            {title && <Heading grey={true} useLabelTag={true}>{title}</Heading>}
            <input
                ref={inputRef} 
                className={`-m-1 h-10 border-b ${error ? `border-red` : `border-grey-300 focus:border-grey-900`} px-1 py-2 ${title && `mt-0`}`} 
                placeholder={placeholder} 
                type='text' 
                value={value}
                onChange={onChange}
                {...props} />
            {hint && <Hint color={error ? 'red' : ''}>{hint}</Hint>}
        </div>
    );
};

export default TextField;