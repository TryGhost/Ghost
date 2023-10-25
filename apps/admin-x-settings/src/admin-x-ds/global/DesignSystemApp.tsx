import DesignSystemProvider from '../providers/DesignSystemProvider';
import React from 'react';
import clsx from 'clsx';

const DesignSystemApp: React.FC<{darkMode: boolean} & React.HTMLProps<HTMLDivElement>> = ({darkMode, className, ...props}) => {
    const appClassName = clsx(
        'admin-x-base',
        darkMode && 'dark',
        className
    );

    return (
        <DesignSystemProvider>
            <div className={appClassName} {...props} />
        </DesignSystemProvider>
    );
};

export default DesignSystemApp;
