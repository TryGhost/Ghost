import clsx from 'clsx';
import React from 'react';
// import {FetchKoenigLexical} from './global/form/HtmlEditor';
import ShadeProvider from './providers/ShadeProvider';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    // fetchKoenigLexical: FetchKoenigLexical;
}

const ShadeApp: React.FC<ShadeAppProps> = ({darkMode, className, children, ...props}) => {
    const appClassName = clsx(
        'shade-base',
        darkMode && 'dark',
        className
    );

    return (
        <div className={appClassName} {...props}>
            <ShadeProvider darkMode={darkMode}>
                {children}
            </ShadeProvider>
        </div>
    );
};

export default ShadeApp;
