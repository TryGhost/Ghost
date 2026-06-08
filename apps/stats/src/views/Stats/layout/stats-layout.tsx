import MainLayout from '@src/components/layout';
import React from 'react';

const StatsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children}) => {
    return (
        <MainLayout>
            <div className='grid w-full grow'>
                <div className='flex h-full flex-col px-6'>
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default StatsLayout;
