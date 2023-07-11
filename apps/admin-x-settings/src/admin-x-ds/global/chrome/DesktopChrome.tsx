import React from 'react';

interface DesktopChromeProps {
    children?: React.ReactNode;
}

const DesktopChrome: React.FC<DesktopChromeProps & React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='flex h-full w-full flex-col px-5 pb-5' {...props}>
            <div className="h-full w-full overflow-hidden rounded-[4px] shadow-xl">
                {children}
            </div>
        </div>
    );
};

export default DesktopChrome;
