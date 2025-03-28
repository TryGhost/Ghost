import clsx from 'clsx';
import React from 'react';

export interface SettingSectionHeaderProps {
    title: string;
    sticky?: boolean;
}

const SettingSectionHeader: React.FC<SettingSectionHeaderProps> = ({title, sticky = false}) => {
    const classNames = clsx(
        'z-20 mb-px pb-10 text-3xl font-bold tracking-tight',
        (sticky ? 'sticky top-0 mt-[calc(-8vmin-4px)] bg-gradient-to-t from-transparent via-white via-20% to-white pt-[calc(8vmin-4px)] dark:bg-black' : 'mt-[-5px]')
    );

    return (
        <h2 className={classNames}>{title}</h2>
    );
};

export default SettingSectionHeader;
