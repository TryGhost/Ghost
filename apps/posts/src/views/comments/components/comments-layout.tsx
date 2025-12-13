import MainLayout from '@components/layout/main-layout';
import React from 'react';

const CommentsLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <MainLayout>
            <div className="grid w-full grow">
                <div className="flex h-full flex-col" data-testid="comments-page">
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default CommentsLayout;
