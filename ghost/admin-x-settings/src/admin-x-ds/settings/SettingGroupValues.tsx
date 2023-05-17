import React from 'react';

import SettingValue from './SettingValue';
import {ISettingValue} from './SettingValue';

interface ISettingGroupValues {
    columns?: 1 | 2;
    values?: Array<ISettingValue>
}

const SettingGroupValues: React.FC<ISettingGroupValues> = ({columns, values}) => {
    let styles = 'flex flex-col gap-6';
    if (columns === 2) {
        styles = 'grid grid-cols-2 gap-6';
    }

    return (
        <div className={styles}>
            {values && values.map(value => (
                <SettingValue key={value.key} heading={value.heading} value={value.value} />
            ))}
        </div>
    );
};

export default SettingGroupValues;