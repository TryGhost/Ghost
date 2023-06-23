import React from 'react';

interface MobileChromeProps {
    children?: React.ReactNode;
}

const MobileChrome: React.FC<MobileChromeProps> = ({children}) => {
    return (
        <div className='flex h-[775px] w-[380px] flex-col rounded-3xl bg-white p-2 shadow-xl'>
            <div className='w-100 h-100 grow overflow-auto rounded-2xl border border-grey-100'>
                {children}
            </div>
        </div>
    );
};

export default MobileChrome;