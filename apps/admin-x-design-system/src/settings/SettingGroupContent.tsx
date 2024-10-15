import React from 'react';

import SettingValue, {SettingValueProps} from './SettingValue';

export interface SettingGroupContentProps {
    columns?: 1 | 2;

    /**
     * Use this array to display setting values with standard formatting in the content area of a setting group
     */
    values?: Array<SettingValueProps>;
    children?: React.ReactNode;
    className?: string;
    // Add this new prop
    customGapY?: string;
}

const SettingGroupContent: React.FC<SettingGroupContentProps> = ({
    columns,
    values,
    children,
    className,
    customGapY
}) => {
    let styles = `flex flex-col gap-x-5 ${customGapY || 'gap-y-7'}`;
    if (columns === 2) {
        styles = `grid grid-cols-1 md:grid-cols-2 gap-x-8 ${customGapY || 'gap-y-6'}`;
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
