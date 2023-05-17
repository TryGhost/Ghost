import React from 'react';

import Heading from './Heading';

interface ITextField {
    title?: string,
    value?: string,
    placeholder?: string,
    help?: React.ReactNode
}

const TextField: React.FC<ITextField> = ({title, value, placeholder, help}) => {
    return (
        <div className='flex flex-col gap-2'>
            {title && <Heading formLabel={true} grey={true}>{title}</Heading>}
            <input className='-m-1 border-b border-grey-300 px-1 py-2 focus:border-grey-900' placeholder={placeholder} type='text' value={value} />
            <span className='text-xs text-grey-700'>{help}</span>
        </div>
    );
};

export default TextField;