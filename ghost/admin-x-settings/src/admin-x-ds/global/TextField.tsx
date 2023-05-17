import React from 'react';

import Heading from './Heading';

interface ITextField {
    title?: string;
    value?: string;
    placeholder?: string;
    help?: React.ReactNode;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextField: React.FC<ITextField> = ({title, value, placeholder, help, onChange, ...props}) => {
    return (
        <div className='flex flex-col'>
            {title && <Heading formLabel={true} grey={true}>{title}</Heading>}
            <input
                className='-m-1 border-b border-grey-300 px-1 py-2 focus:border-grey-900' 
                placeholder={placeholder} 
                type='text' 
                value={value} 
                onChange={onChange}
                {...props} />
            <span className='mt-2 inline-block text-xs text-grey-700'>{help}</span>
        </div>
    );
};

export default TextField;