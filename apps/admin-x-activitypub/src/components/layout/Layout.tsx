import * as React from 'react';
import Sidebar from './Sidebar';
import {Header} from './Header';

const Layout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    const mainRoute = 'inbox';

    return (
        <div className='mx-auto flex h-screen w-full max-w-page flex-col overflow-y-auto' {...props}>
            <Header route={mainRoute} />
            <div className='grid grid-cols-[auto_292px] items-start gap-8 px-8'>
                <div className='z-0'>
                    {children}
                </div>
                <Sidebar route={mainRoute} />
            </div>
        </div>
    );
};

export default Layout;