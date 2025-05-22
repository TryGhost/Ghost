import clsx from 'clsx';
import React from 'react';
// import {FetchKoenigLexical} from './global/form/HtmlEditor';
import ShadeProvider from './providers/ShadeProvider';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    fetchKoenigLexical: null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ShadeApp: React.FC<ShadeAppProps> = ({fetchKoenigLexical, className, children, ...props}) => {
    const appClassName = clsx(
        'shade',
        className
    );

    return (
        <div className={appClassName} {...props}>
            <ShadeProvider>
                {children}
            </ShadeProvider>
        </div>
    );
};

export default ShadeApp;
