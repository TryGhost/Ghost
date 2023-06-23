import React from 'react';

import SettingValue from './SettingValue';
import {ISettingValue} from './SettingValue';

interface ISettingGroupContent {
    columns?: 1 | 2;

    /**
     * Use this array to display setting values with standard formatting in the content area of a setting group
     */
    values?: Array<ISettingValue>;
    children?: React.ReactNode;
    className?: string;
}

const SettingGroupContent: React.FC<ISettingGroupContent> = ({columns, values, children, className}) => {
    let styles = 'flex flex-col gap-x-6 gap-y-7';
    if (columns === 2) {
        styles = 'grid grid-cols-2 gap-x-8 gap-y-6';
    }

    styles += ` ${className}`;

    return (
        <div className={styles}>
            {values && values.map(({key, ...props}) => (
                <SettingValue key={key} {...props} />
            ))}
            {children}
        </div>
    );
};

export default SettingGroupContent;