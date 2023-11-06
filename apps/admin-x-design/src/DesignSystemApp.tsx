import clsx from 'clsx';
import React from 'react';
import {FetchKoenigLexical} from './global/form/HtmlEditor';
import DesignSystemProvider from './providers/DesignSystemProvider';

export interface DesignSystemAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
}

const DesignSystemApp: React.FC<DesignSystemAppProps> = ({darkMode, fetchKoenigLexical, className, ...props}) => {
    const appClassName = clsx(
        'admin-x-base',
        darkMode && 'dark',
        className
    );

    return (
        <DesignSystemProvider fetchKoenigLexical={fetchKoenigLexical}>
            <div className={appClassName} {...props} />
        </DesignSystemProvider>
    );
};

export default DesignSystemApp;
