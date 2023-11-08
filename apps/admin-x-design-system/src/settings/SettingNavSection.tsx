import React from 'react';

export interface SettingNavSectionProps {
    title?: string;
    isVisible?: boolean;
    children?: React.ReactNode;
}

const SettingNavSection: React.FC<SettingNavSectionProps> = ({title, isVisible, children}) => {
    if (!isVisible) {
        return null;
    }

    return (
        <>
            {title && <h2 className='mb-4 ml-2 text-[16px] tracking-tight'>{title}</h2>}
            {children &&
                <ul className="mb-14 mt-[-8px]">
                    {children}
                </ul>
            }
        </>
    );
};

export default SettingNavSection;
