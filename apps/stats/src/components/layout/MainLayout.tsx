import React from 'react';
import Sidebar from '@src/views/Stats/layout/Sidebar';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-screen w-full overflow-y-scroll'>
            <div className='relative grid h-screen grid-cols-[auto_288px] xl:grid-cols-[auto_320px]' {...props}>
                <div className='mx-auto w-full max-w-pageminsidebar'>
                    {children}
                </div>
                <Sidebar />
            </div>
        </div>
    );
};

export default MainLayout;
