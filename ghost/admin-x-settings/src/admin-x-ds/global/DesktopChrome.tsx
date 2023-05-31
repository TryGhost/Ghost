import React from 'react';

export type DesktopChromeSize = 'sm' | 'md';

interface DesktopChromeProps {
    size?: DesktopChromeSize;
    trafficLights?: boolean;
    children?: React.ReactNode;
    chromeClasses?: string;
    headerClasses?: string;
    contentClasses?: string;
    header?: React.ReactNode;
    headerCenter?: boolean;
    border?: boolean;
}

const DesktopChrome: React.FC<DesktopChromeProps> = ({
    size = 'md', 
    trafficLights = true, 
    children, 
    chromeClasses = '',
    headerClasses = '', 
    contentClasses = '', 
    header,
    headerCenter = true,
    border = false
}) => {
    let containerSize = size === 'sm' ? 'h-6 p-2' : 'h-10 p-3';
    const trafficLightSize = size === 'sm' ? 'w-[6px] h-[6px]' : 'w-[10px] h-[10px]';
    const trafficLightContainerStyle = size === 'sm' ? 'gap-[5px] w-[36px] ' : 'gap-2 w-[56px] ';

    contentClasses += ' h-full';

    if (headerCenter) {
        containerSize += size === 'sm' ? ' pr-[48px]' : ' pr-[68px]';
    }

    return (
        <div className={`h-full ${border ? 'rounded-sm border border-grey-100' : ''} ${chromeClasses}`}>
            <header className={`flex items-center justify-between bg-grey-50 ${containerSize} ${headerClasses}`}>
                {trafficLights && 
                    <div className={`flex items-center ${trafficLightContainerStyle}`}>
                        <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
                        <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
                        <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
                    </div>
                }
                {header && header}
            </header>
            <section className={contentClasses}>
                {children}
            </section>
        </div>
    );
};

export default DesktopChrome;