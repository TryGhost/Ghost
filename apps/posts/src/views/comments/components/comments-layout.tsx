import MainLayout from '@components/layout/main-layout';
import React from 'react';

const CommentsLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <MainLayout>
            <div className='grid w-full grow'>
                <div className='flex h-full flex-col lg:has-[>aside]:grid lg:has-[>aside]:grid-cols-[minmax(0,1fr)_460px] lg:has-[>aside]:[&_.prose]:max-w-[70ch] lg:has-[>aside]:[&>*:not(aside)]:col-start-1 lg:has-[>aside]:[&>*:not(aside)]:min-w-0' data-testid='comments-page'>
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default CommentsLayout;
