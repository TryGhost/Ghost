import clsx from 'clsx';
import React from 'react';
import DesignSystemProvider from './providers/DesignSystemProvider';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
}

const ShadeApp: React.FC<ShadeAppProps> = ({darkMode, className, children, ...props}) => {
    const appClassName = clsx(
        'shade',
        darkMode && 'dark',
        className
    );

    return (
        <div className={appClassName} {...props}>
            <DesignSystemProvider darkMode={darkMode}>
                {children}
            </DesignSystemProvider>
        </div>
    );
};

export default ShadeApp;
