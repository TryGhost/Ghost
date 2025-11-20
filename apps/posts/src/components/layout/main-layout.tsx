import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-[calc(100svh-var(--mobile-navbar-height))] w-full overflow-y-scroll sidebar:h-screen'>
            <div className='relative mx-auto flex h-screen max-w-page flex-col' {...props}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
