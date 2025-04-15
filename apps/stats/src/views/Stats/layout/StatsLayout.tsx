import MainLayout from '@src/components/layout';
import React from 'react';
import Sidebar from './Sidebar';

const StatsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children}) => {
    return (
        <MainLayout>
            <div className='grid w-full grow grid-cols-[auto_320px]'>
                <div className='px-8'>
                    {children}
                </div>
                <Sidebar />
            </div>
        </MainLayout>
    );
};

export default StatsLayout;
