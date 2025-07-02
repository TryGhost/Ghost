import clsx from 'clsx';
import React from 'react';
import {FetchKoenigLexical} from './global/form/HtmlEditor';
import DesignSystemProvider from './providers/DesignSystemProvider';

export interface DesignSystemAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
}

const DesignSystemApp: React.FC<DesignSystemAppProps> = ({darkMode, fetchKoenigLexical, className, children, ...props}) => {
    const appClassName = clsx(
        'admin-x-base',
        className
    );

    return (
        <div className={appClassName} {...props}>
            <DesignSystemProvider darkMode={darkMode} fetchKoenigLexical={fetchKoenigLexical}>
                {children}
            </DesignSystemProvider>
        </div>
    );
};

export default DesignSystemApp;
