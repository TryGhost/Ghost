import MainLayout from '@src/components/layout/main-layout';
import React from 'react';

const MembersLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <MainLayout>
            <div className="grid w-full grow">
                <div className="flex h-full flex-col" data-testid="members-page">
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default MembersLayout;
