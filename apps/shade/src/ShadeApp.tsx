import clsx from 'clsx';
import React from 'react';
// import {FetchKoenigLexical} from './global/form/HtmlEditor';
import ShadeProvider from './providers/ShadeProvider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-activitypub shade-stats shade-posts';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ShadeApp: React.FC<ShadeAppProps> = ({darkMode, fetchKoenigLexical, className, children, ...props}) => {
    const appClassName = clsx(
        'shade',
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
