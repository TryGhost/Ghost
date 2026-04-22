import MainLayout from '@components/layout/main-layout';
import React from 'react';

const MembersLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <MainLayout>
            <div className="grid w-full min-w-0 grow">
                <div className="flex h-full min-w-0 flex-col" data-testid="members-page">
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default MembersLayout;
