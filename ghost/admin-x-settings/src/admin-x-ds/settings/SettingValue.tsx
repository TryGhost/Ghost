import React, {ReactNode} from 'react';

import Heading from '../global/Heading';

export interface ISettingValue {
    key: string,
    heading?: string,
    value: ReactNode,
    help?: ReactNode
}

const SettingValue: React.FC<ISettingValue> = ({heading, value, help, ...props}) => {
    return (
        <div className='flex flex-col' {...props}>
            {heading && <Heading grey={true} level={6}>{heading}</Heading>}
            <div className='mt-1'>{value}</div>
            {help && <p className='mt-0.5 text-xs'>{help}</p>}
        </div>
    );
};

export default SettingValue;