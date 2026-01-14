import MainLayout from '@components/layout/main-layout';
import React from 'react';

const MembersLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    children
}) => {
    return (
        <MainLayout>
            <div className="grid w-full grow">
                <div
                    className="flex h-full flex-col"
                    data-testid="members-page"
                >
                    {children}
                </div>
            </div>
        </MainLayout>
    );
};

export default MembersLayout;
