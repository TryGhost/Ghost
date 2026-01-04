import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-full w-full'>
            <div className='relative h-full w-full' {...props}>
                <div className='mx-auto flex size-full max-w-page flex-col'>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
