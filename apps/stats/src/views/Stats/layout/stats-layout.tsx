import MainLayout from '@src/components/layout';
import React, {forwardRef} from 'react';

const StatsLayout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({children}, ref) => {
        return (
            <MainLayout>
                <div ref={ref} className='grid w-full grow'>
                    <div className='flex h-full flex-col px-8'>
                        {children}
                    </div>
                </div>
            </MainLayout>
        );
    }
);

StatsLayout.displayName = 'StatsLayout';

export default StatsLayout;
