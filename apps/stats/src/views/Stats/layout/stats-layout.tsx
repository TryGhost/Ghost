import MainLayout from '@src/components/layout';
import React, {forwardRef} from 'react';

const StatsLayout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({children}, ref) => {
        return (
            <MainLayout>
                <div ref={ref} className='grid w-full min-w-0 grow'>
                    <div className='flex h-full min-w-0 flex-col px-6'>
                        {children}
                    </div>
                </div>
            </MainLayout>
        );
    }
);

StatsLayout.displayName = 'StatsLayout';

export default StatsLayout;
