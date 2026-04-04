import clsx from 'clsx';
import React from 'react';
// import {FetchKoenigLexical} from './global/form/HtmlEditor';
import ShadeProvider from './providers/shade-provider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub shade-stats shade-posts';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
    darkMode: boolean;
    fetchKoenigLexical: null;
    adminUiRedesign?: boolean;
}

let redesignRootUsers = 0;

const syncRedesignRootAttribute = () => {
    if (typeof document === 'undefined') {
        return;
    }

    if (redesignRootUsers > 0) {
        document.documentElement.setAttribute('data-admin-ui-redesign', 'true');
        document.body?.setAttribute('data-admin-ui-redesign', 'true');
    } else {
        document.documentElement.removeAttribute('data-admin-ui-redesign');
        document.body?.removeAttribute('data-admin-ui-redesign');
    }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ShadeApp: React.FC<ShadeAppProps> = ({darkMode, fetchKoenigLexical, adminUiRedesign = false, className, children, ...props}) => {
    const appClassName = clsx(
        'shade',
        className
    );

    React.useEffect(() => {
        if (!adminUiRedesign) {
            return;
        }

        redesignRootUsers += 1;
        syncRedesignRootAttribute();

        return () => {
            redesignRootUsers = Math.max(0, redesignRootUsers - 1);
            syncRedesignRootAttribute();
        };
    }, [adminUiRedesign]);

    return (
        <div className={appClassName} data-admin-ui-redesign={adminUiRedesign ? 'true' : 'false'} {...props}>
            <ShadeProvider adminUiRedesign={adminUiRedesign} darkMode={darkMode}>
                {children}
            </ShadeProvider>
        </div>
    );
};

export default ShadeApp;
