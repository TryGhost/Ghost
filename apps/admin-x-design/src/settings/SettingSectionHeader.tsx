import React from 'react';
import clsx from 'clsx';

interface Props {
    title: string;
    sticky?: boolean;
}

const SettingSectionHeader: React.FC<Props> = ({title, sticky = false}) => {
    const classNames = clsx(
        'z-20 mb-px pb-10 text-4xl font-bold tracking-tighter',
        (sticky ? 'sticky top-0 mt-[calc(-8vmin-4px)] bg-gradient-to-t from-transparent via-white via-20% to-white pt-[calc(8vmin-4px)] dark:bg-black' : 'mt-[-5px]')
    );

    return (
        <h2 className={classNames}>{title}</h2>
    );
};

export default SettingSectionHeader;