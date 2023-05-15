import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';

interface Props {
    name?: string;
    children?: React.ReactNode;
}

const SettingSection: React.FC<Props> = ({ name, children }) => {
    return (
        <>
            {name && <SettingSectionHeader name={name} />}
            {children &&
                <div className="flex flex-col gap-9 mb-[100px]">
                    {children}
                </div>
            }
        </>
    );
}

export default SettingSection;