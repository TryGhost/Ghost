import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';

interface Props {
    title?: string;
    children?: React.ReactNode;
}

const SettingNavSection: React.FC<Props> = ({title, children}) => {
    return (
        <>
            {title && <SettingSectionHeader title={title} />}
            {children &&
                <ul className="mb-10 mt-[-8px]">
                    {children}
                </ul>
            }
        </>
    );
};

export default SettingNavSection;