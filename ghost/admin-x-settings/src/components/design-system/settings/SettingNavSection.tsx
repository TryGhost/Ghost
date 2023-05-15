import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';

interface Props {
    name?: string;
    children?: React.ReactNode;
}

const SettingNavSection: React.FC<Props> = ({ name, children }) => {
    return (
        <>
            {name && <SettingSectionHeader name={name} />}
            {children &&
                <ul className="mt-[-8px] mb-10">
                    {children}
                </ul>
            }
        </>
    );
}

export default SettingNavSection;