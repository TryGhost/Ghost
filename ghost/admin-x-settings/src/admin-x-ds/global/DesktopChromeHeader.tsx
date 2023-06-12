import React from 'react';

export type DesktopChromeHeaderSize = 'sm' | 'md';

interface DesktopChromeHeaderProps {
    size?: DesktopChromeHeaderSize;
    toolbarLeft?: React.ReactNode;
    toolbarCenter?: React.ReactNode;
    toolbarRight?: React.ReactNode;
    toolbarClasses?: string;
}

const DesktopChromeHeader: React.FC<DesktopChromeHeaderProps> = ({
    size = 'md',
    toolbarLeft = '',
    toolbarCenter = '',
    toolbarRight = '',
    toolbarClasses = ''
}) => {
    let containerSize = size === 'sm' ? 'min-h-[32px] p-2' : 'min-h-[48px] p-3';
    const trafficLightSize = size === 'sm' ? 'w-[6px] h-[6px]' : 'w-[10px] h-[10px]';
    const trafficLightWidth = size === 'sm' ? 36 : 56;
    let trafficLightContainerStyle = size === 'sm' ? 'gap-[5px] ' : 'gap-2 ';
    trafficLightContainerStyle += `w-[${trafficLightWidth}px]`;

    const trafficLights = (
        <div className={`absolute left-4 flex h-full items-center ${trafficLightContainerStyle}`}>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
            <div className={`rounded-full bg-grey-500 ${trafficLightSize}`}></div>
        </div>
    );

    return (
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
    );
};

export default DesktopChromeHeader;