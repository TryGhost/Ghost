import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='size-full'>
            <div className='relative mx-auto flex h-full max-w-page flex-col' {...props}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
