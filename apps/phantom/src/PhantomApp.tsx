import clsx from 'clsx';
import React from 'react';
import {FetchKoenigLexical} from './components/ui/HtmlEditor';
import DesignSystemProvider from './providers/DesignSystemProvider';

export interface PhantomAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
}

const PhantomApp: React.FC<PhantomAppProps> = ({darkMode, fetchKoenigLexical, className, children, ...props}) => {
    const appClassName = clsx(
        'admin-x-base',
        darkMode && 'dark',
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

export default PhantomApp;
