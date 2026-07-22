import React, {ReactNode} from 'react';
import {Text} from '@tryghost/shade/primitives';

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
            {heading && <Text as='h6' className='text-base' weight='semibold'>{heading}</Text>}
            <div className={`flex items-center ${heading && `mt-1`}`}>{value}</div>
            {hint && <p className='mt-1'>{hint}</p>}
        </div>
    );
};

export default SettingValue;
