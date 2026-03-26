import React from 'react';

const MembersLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <div className='size-full'>
            <div className='relative flex size-full flex-col'>
                <div className="grid w-full grow">
                    <div className="flex h-full flex-col" data-testid="members-page">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembersLayout;
