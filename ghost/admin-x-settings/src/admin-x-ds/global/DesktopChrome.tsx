import React from 'react';

export type DesktopChromeSize = 'sm' | 'md';

interface DesktopChromeProps {
    size?: DesktopChromeSize;
    toolbarLeft?: React.ReactNode;
    toolbarCenter?: React.ReactNode;
    toolbarRight?: React.ReactNode;
    children?: React.ReactNode;
    chromeClasses?: string;
    toolbarClasses?: string;
    contentClasses?: string;
    border?: boolean;
}

const DesktopChrome: React.FC<DesktopChromeProps> = ({
    size = 'md',
    toolbarLeft = '',
    toolbarCenter = '',
    toolbarRight = '',
    children,
    chromeClasses = '',
    toolbarClasses = '',
    contentClasses = '',
    border = false
}) => {
    let containerSize = size === 'sm' ? 'min-h-[32px] p-2' : 'min-h-[48px] p-3';
    const trafficLightSize = size === 'sm' ? 'w-[6px] h-[6px]' : 'w-[10px] h-[10px]';
    const trafficLightWidth = size === 'sm' ? 36 : 56;
    let trafficLightContainerStyle = size === 'sm' ? 'gap-[5px] ' : 'gap-2 ';
    trafficLightContainerStyle += `w-[${trafficLightWidth}px]`;

    contentClasses += ' grow';

    const trafficLights = (
        <div className={`absolute left-4 flex h-full items-center ${trafficLightContainerStyle}`}>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
        </div>
    );

    return (
        <div className={`flex h-full grow-0 flex-col ${border ? 'rounded-sm border border-grey-100' : ''} ${chromeClasses}`}>
            <header className={`relative flex items-center justify-center bg-grey-50 ${containerSize} ${toolbarClasses}`}>
                {toolbarLeft ?
                    <div className='absolute left-4 flex h-full items-center'>
                        {toolbarLeft}
                    </div>
                    :
                    trafficLights
                }
                <div className='flex grow justify-center'>
                    {(typeof toolbarCenter === 'string') ?
                        (<span className='text-sm font-bold'>{toolbarCenter}</span>)
                        :
                        (<>{toolbarCenter}</>)
                    }
                </div>
                {toolbarRight &&
                    <div className='absolute right-4 flex h-full items-center'>
                        {toolbarRight}
                    </div>
                }
            </header>
            <section className={contentClasses}>
                {children}
            </section>
        </div>
    );
};

export default DesktopChrome;