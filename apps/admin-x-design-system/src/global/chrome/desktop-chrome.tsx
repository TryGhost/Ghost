import React from 'react';

export interface DesktopChromeProps {
    children?: React.ReactNode;
}

const DesktopChrome: React.FC<DesktopChromeProps & React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    return (
        <div className='flex size-full flex-col px-8' {...props}>
            <div className="size-full overflow-hidden rounded-t-[4px] shadow-sm">
                {children}
            </div>
        </div>
    );
};

export default DesktopChrome;
