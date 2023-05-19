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
}

const SettingGroupContent: React.FC<ISettingGroupContent> = ({columns, values, children}) => {
    let styles = 'flex flex-col gap-6';
    if (columns === 2) {
        styles = 'grid grid-cols-2 gap-6';
    }

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