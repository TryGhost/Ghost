import React from 'react';

interface ISettingGroupInputs {
    columns?: 1 | 2;
    children?: React.ReactNode;
}

const SettingGroupInputs: React.FC<ISettingGroupInputs> = ({columns, children}) => {
    let styles = 'flex flex-col gap-6';
    if (columns === 2) {
        styles = 'grid grid-cols-2 gap-6';
    }

    return (
        <div className={styles}>
            {children}
        </div>
    );
};

export default SettingGroupInputs;