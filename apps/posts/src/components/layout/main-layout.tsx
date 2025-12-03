import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-full w-full'>
            <div className='relative mx-auto flex h-full max-w-page flex-col' {...props}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
