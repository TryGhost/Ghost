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
            {title && <h2 className='mb-4 ml-2 text-base font-semibold tracking-normal text-black dark:text-grey-400'>{title}</h2>}
            {children &&
            <>
                <ul className="-mt-1 mb-7">
                    {children}
                </ul>
                <Separator className='mx-2 mb-7 border-grey-300 dark:border-grey-950' />
            </>
            }
        </>
    );
};

export default SettingNavSection;
