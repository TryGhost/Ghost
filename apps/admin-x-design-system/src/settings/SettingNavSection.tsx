import React from 'react';
import {Separator} from '..';

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
            {title && <h2 className='mb-4 ml-2 text-[14px] font-semibold tracking-normal text-grey-900'>{title}</h2>}
            {children &&
            <>
                <ul className="-mt-1 mb-7">
                    {children}
                </ul>
                <Separator className='mx-2 mb-7 border-grey-300' />
            </>
            }
        </>
    );
};

export default SettingNavSection;
