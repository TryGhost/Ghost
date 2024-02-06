import clsx from 'clsx';
import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';

export interface SettingSectionProps {
    title?: string;
    isVisible?: boolean;
    children?: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({title, isVisible = true, children}) => {
    const containerClassNames = clsx(
        'mb-[10vh]',
        isVisible ? '' : 'hidden'
    );

    return (
        <div className={containerClassNames}>
            {title && <SettingSectionHeader title={title} />}
            {children &&
                <div className="mb-10 flex flex-col gap-12">
                    {children}
                </div>
            }
        </div>
    );
};

export default SettingSection;
