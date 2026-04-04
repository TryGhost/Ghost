import React from 'react';
import {useAdminUiRedesign} from '@src/hooks/use-admin-ui-redesign';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    const adminUiRedesign = useAdminUiRedesign();

    return (
        <div className='size-full'>
            <div className={adminUiRedesign ? 'relative flex h-full max-w-page flex-col' : 'relative mx-auto flex h-full max-w-page flex-col'} {...props}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
