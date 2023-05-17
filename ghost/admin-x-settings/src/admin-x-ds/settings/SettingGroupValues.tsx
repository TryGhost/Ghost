import React from 'react';

import SettingValue from './SettingValue';
import {ISettingValue} from './SettingValue';

interface ISettingGroupValues {
    columns?: 1 | 2;
    values?: Array<ISettingValue>;
    children?: React.ReactNode;
}

const SettingGroupValues: React.FC<ISettingGroupValues> = ({columns, values, children}) => {
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

export default SettingGroupValues;