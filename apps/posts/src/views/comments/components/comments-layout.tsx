import MainLayout from '@components/layout/main-layout';
import React from 'react';

const CommentsLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <MainLayout>
            <div className='grid w-full grow'>
                <div className='flex h-full flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto]' data-testid='comments-page'>
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default CommentsLayout;
