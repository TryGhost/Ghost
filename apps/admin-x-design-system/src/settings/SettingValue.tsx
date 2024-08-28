import React, {ReactNode} from 'react';

import Heading from '../global/Heading';

export interface SettingValueProps {
    key: string;
    heading?: string;
    value: ReactNode;
    hint?: ReactNode;
    hideEmptyValue?: boolean;
    'data-testid'?: string;
}

const SettingValue: React.FC<SettingValueProps> = ({heading, value, hint, hideEmptyValue, ...props}) => {
    if (!value && hideEmptyValue) {
        return <></>;
    }

    return (
        <div className='flex flex-col' {...props}>
            {heading && <Heading grey={false} level={6}>{heading}</Heading>}
            <div className={`flex items-center ${heading && `mt-1`}`}>{value}</div>
            {hint && <p className='mt-1 text-xs'>{hint}</p>}
        </div>
    );
};

export default SettingValue;
