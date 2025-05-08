import React from 'react';
// import Sidebar from '@src/views/Stats/layout/Sidebar';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-screen w-full overflow-y-scroll'>
            {/* <div className='relative grid h-screen grid-cols-[auto_288px] xl:grid-cols-[auto_320px]' {...props}> */}
            <div className='relative h-screen w-full' {...props}>
                <div className='mx-auto size-full max-w-page'>
                    {children}
                </div>
                {/* <Sidebar /> */}
            </div>
        </div>
    );
};

export default MainLayout;
