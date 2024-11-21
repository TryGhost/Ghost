import clsx from 'clsx';
import React from 'react';
import {FetchKoenigLexical} from './components/ui/htmleditor';
import DesignSystemProvider from './providers/DesignSystemProvider';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
}

const ShadeApp: React.FC<ShadeAppProps> = ({darkMode, fetchKoenigLexical, className, children, ...props}) => {
    const appClassName = clsx(
        'shade',
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

export default ShadeApp;
