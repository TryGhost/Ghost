import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-screen w-full'>
            <div className='relative mx-auto flex h-screen max-w-page flex-col overflow-y-auto' {...props}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
