import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='size-full'>
            <div className='relative size-full' {...props}>
                <div className='mx-auto flex size-full max-w-page flex-col'>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
