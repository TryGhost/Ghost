import React from 'react';

// import Heading from '../global/Heading';

interface ISettingValue {
    heading?: string,
    value: string,
    help?: string
}

const SettingValue: React.FC<ISettingValue> = ({heading, value, help, ...props}) => {
    return (
        <div {...props}>
            {heading}
            {heading}
            {value}
            {help}
        </div>
    );
};

export default SettingValue;