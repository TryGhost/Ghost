import React from 'react';

const Layout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='h-screen w-full'>
            <div className='relative mx-auto flex max-w-page flex-col' {...props}>
                {children}
            </div>
        </div>
    );
};

export default Layout;
