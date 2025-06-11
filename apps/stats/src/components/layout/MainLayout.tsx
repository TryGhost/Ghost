import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-screen w-full overflow-y-scroll'>
            <div className='relative h-screen w-full' {...props}>
                <div className='mx-auto flex size-full max-w-page flex-col'>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
