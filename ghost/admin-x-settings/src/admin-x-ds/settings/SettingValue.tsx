import React, {ReactNode} from 'react';

import Heading from '../global/Heading';

export interface ISettingValue {
    key: string,
    heading?: string,
    value: ReactNode,
    hint?: ReactNode
}

const SettingValue: React.FC<ISettingValue> = ({heading, value, hint, ...props}) => {
    return (
        <div className='flex flex-col' {...props}>
            {heading && <Heading grey={true} level={6}>{heading}</Heading>}
            <div className={`flex items-center ${heading && `mt-1`}`}>{value}</div>
            {hint && <p className='mt-1 text-xs'>{hint}</p>}
        </div>
    );
};

export default SettingValue;